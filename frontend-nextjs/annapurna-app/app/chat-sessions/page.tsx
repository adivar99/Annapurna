'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChatSession } from '../models/chat';
import chatService from '../services/chatService';
import { useAuth } from '../context/AuthContext';

export default function ChatSessionsPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: isAuthLoading } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isAuthLoading, router]);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await chatService.getSessions();
      setSessions(data);
    } catch (err: any) {
      console.error('Failed to load chat sessions:', err);
      setError('Could not load your cooking chat sessions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadSessions();
    }
  }, [isLoggedIn]);

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await chatService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  };

  const handleOpenSession = (session: ChatSession) => {
    if (session.recipe_id) {
      router.push(`/chat?recipeId=${session.recipe_id}&session=${session.session_id}`);
    } else {
      router.push(`/chat?session=${session.session_id}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 italiana">Cooking Chat History</h1>
          <p className="text-stone-600 text-sm mt-1">Pick up where you left off with Anu AI.</p>
        </div>
        <Link
          href="/home"
          className="text-sm font-semibold text-[#ff9f1d] hover:text-[#e88d15]"
        >
          ← Back to Home
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#ff9f1d] border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-red-50 rounded-2xl border border-red-200 p-8">
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadSessions}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition"
          >
            Try Again
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 p-12 shadow-sm">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">No Chat Sessions Found</h2>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
            Start a cooking session by viewing any recipe and asking Anu questions about preparation, timings, or ingredient substitutions!
          </p>
          <Link
            href="/home"
            className="inline-block bg-[#758e4f] hover:bg-[#627741] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            Find a Recipe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              onClick={() => handleOpenSession(session)}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between hover:border-orange-300 group"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="text-base font-bold text-stone-900 group-hover:text-[#ff9f1d] transition line-clamp-1">
                    {session.recipe_title || 'Recipe Chat'}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteSession(e, session.session_id)}
                    className="text-stone-400 hover:text-red-500 p-1 text-sm font-bold transition"
                    title="Delete Conversation"
                  >
                    🗑
                  </button>
                </div>

                <p className="text-stone-600 text-xs line-clamp-2 leading-relaxed mb-4 italic">
                  {session.last_message ? `"${session.last_message}"` : 'No messages in this conversation.'}
                </p>
              </div>

              <div className="flex justify-between items-center text-[11px] text-stone-400 border-t border-stone-100 pt-3">
                <span>
                  {session.updated_at
                    ? new Date(session.updated_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recent'}
                </span>
                <span className="font-semibold text-[#ff9f1d] group-hover:translate-x-1 transition-transform">
                  Resume →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
