import React from 'react';

export default function Notification({ message, isDark, onClick, isClickable }) {
  if (!message) return null;

  const baseClasses = `fixed bottom-24 sm:bottom-32 left-4 sm:left-10 z-[2000] backdrop-blur-md border px-4 sm:px-5 py-2 sm:py-2.5 rounded-full flex items-center gap-2 sm:gap-3 ${
    isDark 
      ? 'bg-zinc-900/80 border-orange-500/30' 
      : 'bg-white/90 border-orange-400/40 shadow-lg'
  }`;

  const interactiveClasses = isClickable 
    ? `cursor-pointer transition-all hover:scale-105 ${
        isDark 
          ? 'hover:border-orange-500/50 hover:bg-zinc-900/90' 
          : 'hover:border-orange-400/60 hover:bg-white'
      }` 
    : '';

  return (
    <div 
      className={`${baseClasses} ${interactiveClasses}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
      <span className={`text-[8px] sm:text-[9px] tracking-widest uppercase ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
        {message}
      </span>
      {isClickable && (
        <span className={`text-[8px] ml-1 ${isDark ? 'text-orange-400/60' : 'text-orange-500/60'}`}>
          → Click to view
        </span>
      )}
    </div>
  );
}