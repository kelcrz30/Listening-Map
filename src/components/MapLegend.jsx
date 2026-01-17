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
        className={`fixed bottom-32 md:bottom-24 left-6 z-[5001] w-12 h-12 rounded-full flex items-center justify-center border backdrop-blur-md transition-all active:scale-90
          ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white/80 border-gray-200 text-gray-600'}`}
      >
        <span className="text-sm font-bold tracking-widest">?</span>
      </button>
    );
  }

  return (
    <div className={`fixed left-4 right-4 md:left-6 md:right-auto bottom-32 md:bottom-24 z-[5001] md:w-80 p-6 rounded-2xl border backdrop-blur-xl transition-all animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-left-4 duration-700
      ${isDark ? 'bg-black/80 border-white/10 text-white' : 'bg-white/95 border-gray-200 text-gray-900'}`}>
      
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-[12px] uppercase tracking-[0.2em] font-bold opacity-60">Map Guide</h3>
        <button onClick={() => setIsOpen(false)} className="text-[11px] font-bold opacity-40 hover:opacity-100 tracking-wider uppercase p-1">Hide</button>
      </div>

      <div className="space-y-6">
        {/* Unheard */}
        <div className="flex items-start gap-4">
          <div className="w-3 h-3 mt-1 rounded-full bg-[#32CD32] shadow-[0_0_10px_#32CD32] shrink-0" />
          <div>
            <p className="text-[15px] md:text-[13px] font-bold uppercase tracking-widest leading-none mb-1.5">Unheard</p>
            <p className="text-[14px] md:text-[12px] opacity-70 leading-relaxed">
              This is a secret that has drifted onto the map but hasn't been heard yet. 
              It is waiting for the first person to acknowledge it.
            </p>
          </div>
        </div>

        {/* Listening */}
        <div className="flex items-start gap-4">
          <div className="w-3 h-3 mt-1 rounded-full bg-orange-500 shadow-[0_0_15px_#f59e0b] animate-pulse shrink-0" />
          <div>
            <p className="text-[15px] md:text-[13px] font-bold uppercase tracking-widest text-orange-400 leading-none mb-1.5">Listening</p>
            <p className="text-[14px] md:text-[12px] opacity-70 leading-relaxed">
              Someone else on the map has this secret open and is clicking "Listen". You are seeing their live presence in real-time.
            </p>
          </div>
        </div>

        {/* Echoed */}
        <div className="flex items-start gap-4">
          <div className="w-3 h-3 mt-1 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)] shrink-0" />
          <div>
            <p className="text-[15px] md:text-[13px] font-bold uppercase tracking-widest text-purple-400 leading-none mb-1.5">Echoed</p>
            <p className="text-[14px] md:text-[12px] opacity-70 leading-relaxed">
              You have already visited this heart and sent an "Echo". It stays purple to show that this story is now part of your journey.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <p className="text-[10px] italic opacity-50 uppercase tracking-wide">
          * Circles grow larger with every Echo.
        </p>
      </div>
    </div>
  );
}