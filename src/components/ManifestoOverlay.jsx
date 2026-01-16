import React from 'react';

export default function ManifestoOverlay({ onClose }) {
  return (
    <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/95 backdrop-blur-2xl">
      <div className="text-center px-6 max-w-2xl">
        <h1 className="text-6xl sm:text-8xl font-serif italic text-white/90 mb-10 tracking-tight">
          Sulyap
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base leading-relaxed mb-16 font-light">
          "This is a map of things we carry but never say."
        </p>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-[10px] tracking-[0.4em] uppercase border border-white/10 px-10 py-5 rounded-full transition-all hover:bg-white/5">
          Enter the Silence
        </button>
      </div>
    </div>
  );
}