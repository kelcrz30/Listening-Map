import React from 'react';

const PresenceCounter = ({ count, isDark }) => {
  return (
    <div className="fixed top-6 sm:top-12 left-4 sm:left-12 z-[1000] pointer-events-none">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </div>
          <span className={`text-[8px] sm:text-[9px] tracking-[0.4em] sm:tracking-[0.6em] uppercase ${isDark ? 'text-white/30' : 'text-gray-500'}`}>
            Presence
          </span>
        </div>
        <div className={`mt-2 flex items-baseline gap-2 sm:gap-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <span className="text-2xl sm:text-4xl font-serif italic">{count}</span>
          <span className={`text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] uppercase ${isDark ? 'text-zinc-600' : 'text-gray-500'}`}>
            Hearts Listening
          </span>
        </div>
      </div>
    </div>
  );
};

export default PresenceCounter;