import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import LoginModal from './LoginModal';

export default function AuthButton({ isDark }) {
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    // Check current session status on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for sign-in/sign-out changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Close menu when clicking outside on the map
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleGoogleLogin = () => {
    supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setShowMenu(false);
  };

  // If user is logged in, show Sign Out
  if (user) {
    return (
      <button 
        onClick={handleLogout}
        className={`px-4 py-2.5 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all backdrop-blur-md active:scale-95
          ${isDark ? 'bg-red-950/20 border-red-500/30 text-red-400 hover:bg-red-900/30' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}
      >
        Sign Out
      </button>
    );
  }

  // If guest, show Sign In / Join
  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setShowMenu(!showMenu)}
        className={`px-4 py-2.5 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-2 active:scale-95
          ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        Sign In / Join
      </button>

      {showMenu && (
        <div className={`absolute bottom-full mb-2 left-0 w-48 p-2 rounded-xl border backdrop-blur-xl shadow-2xl z-[5002] flex flex-col gap-1 animate-fade-in-up
          ${isDark ? 'bg-zinc-900/90 border-white/10' : 'bg-white/90 border-gray-200'}`}>
          
          <button 
            onClick={handleGoogleLogin}
            className={`w-full text-left px-3 py-2 rounded-lg text-[10px] uppercase tracking-wider transition-colors
              ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-gray-100 text-gray-600'}`}>
            Continue with Google
          </button>
          
          <div className={`h-[1px] my-1 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`} />
          
          <p className="text-[7px] text-zinc-500 px-3 py-1 uppercase tracking-[0.2em] font-bold">Own Account</p>
          
          <button 
            onClick={() => {
              setIsModalOpen(true);
              setShowMenu(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-[10px] uppercase tracking-wider transition-colors
              ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-gray-100 text-gray-600'}`}>
            Login / Sign Up
          </button>
        </div>
      )}

      <LoginModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        isDark={isDark} 
      />
    </div>
  );
}