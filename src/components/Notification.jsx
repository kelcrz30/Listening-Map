import React from 'react';

export default function Notification({ message, isDark }) {
  if (!message) return null;

  return (
    <div className={`fixed bottom-24 sm:bottom-32 left-4 sm:left-10 z-[2000] backdrop-blur-md border px-4 sm:px-5 py-2 sm:py-2.5 rounded-full flex items-center gap-2 sm:gap-3 ${
      isDark 
        ? 'bg-zinc-900/80 border-orange-500/30' 
        : 'bg-white/90 border-orange-400/40 shadow-lg'
    }`}>
      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
      <span className={`text-[8px] sm:text-[9px] tracking-widest uppercase ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
        {message}
      </span>
    </div>
  );
}