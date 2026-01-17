import React from 'react';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, isDark }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
      {/* Soft Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />
      
      <div className={`relative max-w-xs w-full p-10 text-center transform transition-all animate-in zoom-in-95 duration-300 ${
        isDark 
          ? 'bg-zinc-950/40 border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]' 
          : 'bg-white/80 border border-zinc-200 shadow-xl'
      } rounded-[2rem]`}>
        


        {/* Poetic Title */}
        <h2 className={`text-[10px] uppercase tracking-[0.6em] mb-4 font-light ${
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        }`}>
          Release Silence
        </h2>

        {/* Message */}
        <p className={`text-sm mb-10 font-serif italic leading-relaxed ${
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        }`}>
          "Should this thought fade back into the shadows?"
        </p>

        {/* Minimal Buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={onConfirm}
            className={`w-full py-4 text-[9px] uppercase tracking-[0.4em] transition-all border rounded-full ${
              isDark 
                ? 'border-red-900/30 text-red-400/60 hover:text-red-400 hover:bg-red-500/5' 
                : 'border-red-100 text-red-400 hover:bg-red-50'
            }`}
          >
            Let it go
          </button>
          
          <button
            onClick={onClose}
            className={`w-full py-2 text-[8px] uppercase tracking-[0.4em] opacity-40 hover:opacity-100 transition-all ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}
          >
            Hold on
          </button>
        </div>
      </div>
    </div>
  );
}