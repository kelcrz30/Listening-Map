import React, { useEffect } from 'react';

export default function AboutModal({ onClose }) {
  // Close on Escape key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/90 backdrop-blur-2xl px-4"
      onClick={onClose} // Click background to close
    >
      <div 
        className="max-w-lg w-full bg-zinc-950/80 border border-white/10 rounded-3xl p-12 relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
      >
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-zinc-500 hover:text-white text-2xl transition-colors"
          aria-label="Close modal"
        >
          &times;
        </button>

        <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-6">
          The Philosophy
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-10">
          "I built this map to visualize the weight of the things we keep inside. 
          Every dot is a breath, every nod is an echo."
          <br /><br />
          Sulyap is a digital sanctuary for the unspoken. It is a collective constellation 
          of secrets, shared anonymously from every corner of the world.
        </p>

        <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-4">
          Privacy & Presence
        </h2>
        <ul className="text-zinc-500 text-[11px] leading-relaxed space-y-3 mb-8">
          <li>
            <span className="text-zinc-300">ANONYMITY:</span> No accounts, no emails, no tracking. 
            We do not know who you are, and we like it that way.
          </li>
          <li>
            <span className="text-zinc-300">EPHEMERAL ID:</span> We use a temporary session key to prevent spam. 
            This key is scrambled into a mathematical hash and is wiped from existence when you close your browser tab.
          </li>
          <li>
            <span className="text-zinc-300">LOCATION:</span> Your words are pinned to a place, but we slightly blur 
            your exact coordinates to ensure your precise location remains private.
          </li>
          <li>
            <span className="text-zinc-300">MODERATION:</span> While this is a space for freedom, the wind 
            carries away words of hate or harm.
          </li>
        </ul>

        <div className="pt-6 border-t border-white/5">
            <p className="text-zinc-600 text-[10px] italic">- Kel</p>
        </div>

        <button
          onClick={onClose}
          className="mt-8 text-zinc-400 hover:text-white text-[9px] uppercase tracking-widest border border-white/10 px-6 py-3 rounded-full hover:bg-white/5 transition-all"
        >
          Return to the Map
        </button>
      </div>
    </div>
  );
}