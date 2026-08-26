'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Recipe } from '../models/recipe';
import { ChatMessage } from '../models/chat';
import recipeService from '../services/recipeService';
import chatService from '../services/chatService';
import speechService from '../services/speechService';
import voiceAgentService from '../services/voiceAgentService';
import { useAuth } from '../context/AuthContext';

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoggedIn, isLoading: isAuthLoading } = useAuth();

  const recipeId = searchParams.get('recipeId') || searchParams.get('recipe_id');
  const sessionQueryId = searchParams.get('session') || searchParams.get('session_id');

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Mobile View Tab Switch: 'recipe' vs 'chat'
  const [activeMobileTab, setActiveMobileTab] = useState<'recipe' | 'chat'>('chat');

  // Speech & Voice Agent States
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isVoiceAgentActive, setIsVoiceAgentActive] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isAuthLoading, router]);

  useEffect(() => {
    setIsSpeechSupported(speechService.isSupported());
  }, []);

  useEffect(() => {
    async function initRecipeAndSession() {
      if (!recipeId && !sessionQueryId) {
        setErrorBanner('No recipe or session specified.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        let currentRecipe: Recipe | null = null;
        let activeSessionId: string | null = sessionQueryId;

        if (sessionQueryId) {
          const sessionDetails = await chatService.getSession(sessionQueryId);
          if (sessionDetails) {
            setMessages(sessionDetails.messages || []);
            setSessionId(sessionDetails.session_id);
            if (sessionDetails.recipe) {
              currentRecipe = sessionDetails.recipe;
              setRecipe(currentRecipe);
            }
          }
        }

        if (recipeId && !currentRecipe) {
          currentRecipe = await recipeService.getRecipeById(recipeId);
          setRecipe(currentRecipe);

          // Check if existing session exists for this recipe
          const existingSession = await chatService.getSessionByRecipe(recipeId);
          if (existingSession) {
            activeSessionId = existingSession.session_id;
            setSessionId(activeSessionId);
            setMessages(existingSession.messages || []);
          } else {
            // Create a new chat session for this recipe
            const newSession = await chatService.createSession(recipeId);
            activeSessionId = newSession.session_id;
            setSessionId(activeSessionId);

            // Initial greeting message
            const greeting = `Hello! I'm Anu, your cooking assistant. Let's talk about how to make ${currentRecipe.title}! Ask me anything about substitutions, timing, or techniques.`;
            await chatService.addMessage(activeSessionId, greeting, 'ai');
            setMessages([{ sender: 'ai', text: greeting, created_at: new Date().toISOString() }]);
          }
        }
      } catch (err: any) {
        console.error('Failed to initialize recipe chat:', err);
        setErrorBanner(err.message || 'Could not load recipe or chat session.');
      } finally {
        setIsLoading(false);
      }
    }

    if (isLoggedIn) {
      initRecipeAndSession();
    }
  }, [recipeId, sessionQueryId, isLoggedIn]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || userInput;
    if (!textToSend.trim() || !sessionId || !recipe || isSending) return;

    setUserInput('');
    setIsSending(true);

    const userMsg: ChatMessage = {
      sender: 'user',
      text: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      await chatService.addMessage(sessionId, textToSend, 'user');
      const aiResponse = await recipeService.askQuestion(recipe, textToSend);

      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: aiResponse.response,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);
      await chatService.addMessage(sessionId, aiResponse.response, 'ai');

      if (isListening) {
        speechService.speak(aiResponse.response);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setErrorBanner('Failed to receive response from cooking assistant.');
      setTimeout(() => setErrorBanner(null), 5000);
    } finally {
      setIsSending(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      speechService.startListening(
        (transcript) => {
          let cleanTranscript = transcript;
          const heyAnuIndex = transcript.toLowerCase().indexOf('hey anu');
          if (heyAnuIndex !== -1) {
            cleanTranscript = transcript.substring(heyAnuIndex + 7).trim();
          }
          if (cleanTranscript) {
            handleSendMessage(cleanTranscript);
          }
        },
        (error) => {
          console.warn('Speech recognition error:', error);
          setIsListening(false);
        }
      );
    }
  };

  const toggleVoiceAgent = async () => {
    if (isVoiceAgentActive) {
      voiceAgentService.stop();
      setIsVoiceAgentActive(false);
      setVoiceStatus('');
    } else {
      if (!canvasRef.current) return;
      try {
        setIsVoiceAgentActive(true);
        await voiceAgentService.start(canvasRef.current, (status) => setVoiceStatus(status));
      } catch (err: any) {
        setErrorBanner('Could not start Realtime voice session. Please ensure microphone access is permitted.');
        setIsVoiceAgentActive(false);
        setTimeout(() => setErrorBanner(null), 5000);
      }
    }
  };

  const handleCloseSession = async () => {
    if (sessionId) {
      try {
        await chatService.deleteSession(sessionId);
      } catch (e) {
        console.warn('Could not delete session on close:', e);
      }
    }
    router.push('/home');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-[#ff9f1d] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      {errorBanner && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl flex justify-between items-center text-xs sm:text-sm">
          <span>{errorBanner}</span>
          <button onClick={() => setErrorBanner(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* Mobile Tab Switcher (Visible only on < lg screens) */}
      <div className="flex lg:hidden bg-stone-200/80 p-1 rounded-2xl mb-4 border border-stone-300 shadow-inner">
        <button
          onClick={() => setActiveMobileTab('recipe')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'recipe'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>📖</span>
          <span>Recipe Guide</span>
        </button>
        <button
          onClick={() => setActiveMobileTab('chat')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'chat'
              ? 'bg-[#ff9f1d] text-white shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>💬</span>
          <span>AI Assistant</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[75vh] lg:min-h-[82vh]">
        {/* Left Panel: Recipe Guide */}
        <div
          className={`lg:col-span-5 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col max-h-[75vh] lg:max-h-[85vh] ${
            activeMobileTab === 'recipe' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {recipe && (
            <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
              {recipe.imageUrl && (
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  className="w-full h-44 sm:h-56 object-cover rounded-xl shadow-inner"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Annapurna+Recipe';
                  }}
                />
              )}

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mb-2">{recipe.title}</h1>
                <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs font-medium text-stone-600 mb-3">
                  <span className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full border border-orange-200">
                    ⏱ Prep: {recipe.prep_time}m | Cook: {recipe.cook_time}m
                  </span>
                  <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-200">
                    🍽 {recipe.servings} Servings
                  </span>
                  <span className="bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full border border-stone-200 capitalize">
                    🏷 {recipe.difficulty}
                  </span>
                </div>
                {recipe.description && (
                  <p
                    className="text-stone-600 text-xs sm:text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: recipe.description }}
                  />
                )}
              </div>

              {/* Ingredients List */}
              <div className="border-t border-stone-200 pt-4">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 mb-2.5 flex items-center gap-2">
                  <span>🥕</span> Ingredients
                </h2>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="flex items-start text-xs sm:text-sm text-stone-700">
                      <span className="inline-block w-2 h-2 rounded-full bg-orange-400 mt-1.5 mr-2.5 flex-shrink-0"></span>
                      <span>
                        <strong className="font-semibold">{ing.quantity > 0 ? `${ing.quantity} ` : ''}{ing.unit ? `${ing.unit} ` : ''}</strong>
                        {ing.name} {ing.notes ? <span className="text-stone-400 italic text-xs">({ing.notes})</span> : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions Steps */}
              <div className="border-t border-stone-200 pt-4">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 mb-2.5 flex items-center gap-2">
                  <span>👨‍🍳</span> Instructions
                </h2>
                <ol className="space-y-2.5">
                  {recipe.instructions.map((step, idx) => (
                    <li key={idx} className="flex items-start text-xs sm:text-sm text-stone-700 bg-stone-50 p-2.5 sm:p-3 rounded-xl border border-stone-100">
                      <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#ff9f1d] text-white text-[10px] sm:text-xs font-bold flex items-center justify-center mr-2.5 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="flex-1 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: AI Chef Chat & Voice */}
        <div
          className={`lg:col-span-7 bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col max-h-[75vh] lg:max-h-[85vh] overflow-hidden ${
            activeMobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Chat Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/90">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#758e4f] text-white flex items-center justify-center text-sm sm:text-lg font-bold shadow-sm">
                🍳
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-xs sm:text-sm md:text-base">Anu - AI Assistant</h3>
                <p className="text-[10px] sm:text-xs text-stone-500">Live cooking guide & voice companion</p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <button
                onClick={toggleVoiceAgent}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1 transition shadow-sm ${
                  isVoiceAgentActive
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                }`}
                title="Realtime Voice Agent"
              >
                <span>🎙</span>
                <span className="hidden sm:inline">{isVoiceAgentActive ? 'End Call' : 'Live Voice'}</span>
              </button>

              <button
                onClick={handleCloseSession}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg text-sm"
                title="Finish & Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
            {messages.map((msg, index) => {
              const isAi = msg.sender === 'ai';
              return (
                <div
                  key={index}
                  className={`flex items-start gap-2 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#758e4f] text-white flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 mt-0.5">
                      Anu
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      isAi
                        ? 'bg-stone-100 text-stone-800 rounded-tl-sm'
                        : 'bg-[#ff9f1d] text-white rounded-tr-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            {isSending && (
              <div className="flex items-center space-x-2 text-stone-400 text-xs italic ml-9 sm:ml-10">
                <span className="animate-pulse">Anu is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Waveform Visualizer */}
          {isVoiceAgentActive && (
            <div className="px-4 py-2.5 bg-stone-900 border-t border-stone-800 flex flex-col items-center">
              <canvas
                ref={canvasRef}
                width={600}
                height={50}
                className="w-full max-w-lg h-10 sm:h-12 rounded-lg bg-stone-950"
              />
              <span className="text-[11px] text-orange-400 mt-1 font-medium">{voiceStatus}</span>
            </div>
          )}

          {/* Chat Input Bar */}
          <div className="p-3 sm:p-4 border-t border-stone-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-1.5 sm:space-x-2"
            >
              {isSpeechSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-2 sm:p-2.5 rounded-xl border transition flex-shrink-0 ${
                    isListening
                      ? 'bg-red-500 text-white border-red-600 animate-pulse'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                  }`}
                  title={isListening ? 'Stop listening' : 'Speak with microphone'}
                >
                  🎤
                </button>
              )}

              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={isListening ? 'Listening for speech...' : 'Ask Anu a question...'}
                className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff9f1d] text-xs sm:text-sm"
                disabled={isVoiceAgentActive || isSending}
              />

              <button
                type="submit"
                disabled={!userInput.trim() || isSending || isVoiceAgentActive}
                className="bg-[#ff9f1d] hover:bg-[#e88d15] text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex-shrink-0"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[70vh]">Loading chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
