import React from 'react';

export default function AboutModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/90 backdrop-blur-2xl px-4">
      <div className="max-w-lg w-full bg-zinc-950/80 border border-white/10 rounded-3xl p-12 relative">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-zinc-500 hover:text-white text-2xl">
          &times;
        </button>
        <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-8">
          The Philosophy
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          "I built this map to visualize the weight of the things we keep inside. Every dot is a breath, every nod is an echo."
          <br /><br />- Kel
        </p>
        <button
          onClick={onClose}
          className="mt-8 text-zinc-500 hover:text-white text-[9px] uppercase tracking-widest">
          Close
        </button>
      </div>
    </div>
  );
}