import React from 'react';

export default function ManifestoOverlay({ onClose }) {
  return (
    <div className="fixed inset-0 z-[2001] flex flex-col items-center justify-between bg-[#0a0a0a] py-20 px-6">
      
      {/* Top Decoration */}
      <div className="text-[10px] tracking-[0.8em] text-zinc-800 uppercase animate-pulse">
        Establishing Connection
      </div>

      <div className="text-center max-w-3xl">
        {/* Main Title - Serif and Bold */}
        <h1 className="text-8xl sm:text-[12rem] font-serif italic text-white leading-none mb-4 select-none">
          Sulyap
        </h1>
        
        {/* The Quote - Narrow and light */}
        <p className="text-zinc-500 text-sm sm:text-lg font-light tracking-widest leading-relaxed max-w-md mx-auto mb-12">
          A landscape of things we carry, <br /> but never say.
        </p>

        {/* The Interaction - No box, just text and a line */}
        <button
          onClick={onClose}
          className="group flex flex-col items-center gap-4 mx-auto transition-all"
        >
          <span className="text-white/40 group-hover:text-white text-[10px] tracking-[0.5em] uppercase transition-colors">
            Enter the Silence
          </span>
          <div className="h-[60px] w-[1px] bg-gradient-to-b from-white/40 to-transparent group-hover:h-[80px] transition-all duration-500" />
        </button>
      </div>

      {/* Bottom Stats or Detail */}
      <div className="flex gap-12 text-[9px] tracking-[0.3em] text-zinc-700 uppercase">
        <span>Global Presence</span>
        <span>—</span>
        <span>Anonymous</span>
      </div>

      {/* Optional: Subtle Grain Overlay via CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .bg-grain {
          pointer-events: none;
          background-image: url("https://grainy-gradients.vercel.app/noise.svg");
          filter: contrast(150%) brightness(100%);
        }
      `}} />
      <div className="absolute inset-0 bg-grain opacity-[0.03] pointer-events-none" />
    </div>
  );
}