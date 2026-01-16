import React, { useState, useEffect } from 'react';

export default function MapLegend({ isDark }) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        // MOBILE: bottom-32 (to clear the dock) | DESKTOP: bottom-24
        className={`fixed bottom-32 md:bottom-24 left-6 z-[5001] w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-md transition-all active:scale-90
          ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white/80 border-gray-200 text-gray-600'}`}
      >
        <span className="text-xs font-bold tracking-widest">?</span>
      </button>
    );
  }

  return (
    <div className={`fixed left-4 right-4 md:left-6 md:right-auto bottom-32 md:bottom-24 z-[5001] md:w-64 p-5 rounded-2xl border backdrop-blur-xl transition-all animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-left-4 duration-700
      ${isDark ? 'bg-black/60 border-white/10 text-white' : 'bg-white/90 border-gray-200 text-gray-900'}`}>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-50">Map Guide</h3>
        <button onClick={() => setIsOpen(false)} className="text-[9px] font-bold opacity-30 hover:opacity-100 tracking-tighter uppercase">Hide</button>
      </div>

      <div className="space-y-4">
        {/* Unheard */}
        <div className="flex items-start gap-3">
          <div className="w-2.5 h-2.5 mt-1 rounded-full bg-white shadow-[0_0_8px_white]" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest leading-none mb-1">Unheard</p>
            <p className="text-[9px] opacity-50 leading-relaxed">This is a secret that has drifted onto the map but hasn't been heard yet. It is waiting for the first person to acknowledge it.</p>
          </div>
        </div>

        {/* Listening */}
        <div className="flex items-start gap-3">
          <div className="w-2.5 h-2.5 mt-1 rounded-full bg-orange-500 shadow-[0_0_12px_#f59e0b] animate-pulse" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400 leading-none mb-1">Listening</p>
            <p className="text-[9px] opacity-50 leading-relaxed">Someone else on the map has this secret open and is clicking "Listen". You are seeing their live presence in real-time.</p>
          </div>
        </div>

        {/* Echoed */}
        <div className="flex items-start gap-3">
          <div className="w-2.5 h-2.5 mt-1 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400 leading-none mb-1">Echoed</p>
            <p className="text-[9px] opacity-50 leading-relaxed">You have already visited this heart and sent an "Echo". It stays purple to show that this story is now part of your journey.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5">
        <p className="text-[8px] italic opacity-40 uppercase tracking-tight">
          * Circles grow larger with every Echo.
        </p>
      </div>
    </div>
  );
}