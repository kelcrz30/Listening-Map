import React from 'react';

export default function AboutModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/90 backdrop-blur-2xl px-4">
      <div className="max-w-lg w-full bg-zinc-950/80 border border-white/10 rounded-3xl p-10 relative">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-zinc-500 hover:text-white text-2xl transition-colors">
          &times;
        </button>

        {/* Section 1: Philosophy */}
        <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-6">
          The Philosophy
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-10">
          "I built this map to visualize the weight of the things we keep inside. Every dot is a breath, every nod is an echo."
          <br /><br />- Kel
        </p>

        {/* Section 2: Privacy (Added this part) */}
        <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-6">
          Privacy & Data
        </h2>
        <div className="space-y-4">
          <p className="text-zinc-500 text-[11px] leading-relaxed italic">
            "Your silence is safe here."
          </p>
          <ul className="text-zinc-400 text-[11px] space-y-2 list-none">
            <li className="flex gap-2">
              <span className="text-zinc-600">○</span> 
              <span>No accounts, emails, or names are ever collected.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-600">○</span> 
              <span>We use anonymous browser identifiers strictly to prevent bot spam.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-600">○</span> 
              <span>Locations are approximate; we never track your precise GPS coordinates.</span>
            </li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="mt-12 text-zinc-500 hover:text-white text-[9px] uppercase tracking-widest border-b border-zinc-800 pb-1 hover:border-white transition-all">
          Close
        </button>
      </div>
    </div>
  );
}