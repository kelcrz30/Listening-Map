import React from 'react';

export default function DonationModal({ isOpen, onClose, isDark }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
      <div className={`max-w-sm w-full p-10 rounded-[2.5rem] text-center border shadow-2xl ${
        isDark ? 'bg-zinc-950 border-white/5 text-white' : 'bg-white border-black/5 text-black'
      }`}>
        
        {/* Poetic Header */}
        <h2 className="text-[10px] font-light uppercase tracking-[0.5em] mb-6 opacity-60">
          Support the Silence
        </h2>
        
        <p className={`text-sm md:text-base mb-10 leading-relaxed font-serif italic ${
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        }`}>
          "Every peso helps keep these whispers drifting through the digital wind."
        </p>

        {/* GCash QR Section */}
        <div className="relative group mb-8">
          {/* Subtle Glow Effect */}
          <div className="absolute -inset-1 bg-blue-500/20 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          
          <div className="relative bg-white p-4 rounded-[2rem] inline-block border border-blue-100">
            <img 
              src="/gcash-qr.jpg" 
              alt="Scan via GCash" 
              className="w-52 h-52 md:w-60 md:h-60 object-contain rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-blue-500">
              Scan this on GCash
            </p>
            <p className={`text-[8px] uppercase tracking-[0.2em] opacity-30 ${isDark ? 'text-white' : 'text-black'}`}>
              Express Send • Thank you for your kindness
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className={`w-full py-4 rounded-full text-[9px] font-bold uppercase tracking-[0.3em] transition-all active:scale-95 border ${
              isDark 
                ? 'bg-transparent hover:bg-white/5 text-white/60 hover:text-white border-white/10' 
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-500 border-zinc-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}