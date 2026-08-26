'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAuth();

  // Hide Navbar on landing, login, register, and advanced search (as in Angular app)
  if (!isLoggedIn || pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/advanced-search') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-[#758e4f] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/home" className="flex items-center space-x-2">
          <span className="text-3xl font-bold tracking-wider italiana text-white drop-shadow">
            Annapurna
          </span>
        </Link>

        {/* Action icons */}
        <div className="flex items-center space-x-6">
          <Link
            href="/chat-sessions"
            className="flex items-center space-x-1 hover:text-orange-200 transition text-sm font-medium"
            title="Chat History"
          >
            {/* Chat Icon SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="hidden md:inline">History</span>
          </Link>

          {/* User info & Logout */}
          <div className="flex items-center space-x-4 pl-4 border-l border-green-700/50">
            <span className="text-sm font-medium text-green-100 hidden sm:inline">
              Hi, {user?.name || user?.username || 'Chef'}
            </span>
            <button
              onClick={logout}
              className="flex items-center space-x-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition text-sm font-medium"
              title="Logout"
            >
              {/* Logout SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
