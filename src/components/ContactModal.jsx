import React, { useState } from 'react';

export default function ContactModal({ onClose, setNotification }) {
  const [suggestion, setSuggestion] = useState("");

  const handleSubmit = () => {
    setNotification("Note received.");
    onClose();
    setSuggestion("");
  };

  return (
    <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/90 backdrop-blur-2xl px-4">
      <div className="max-w-lg w-full bg-zinc-950/80 border border-white/10 rounded-3xl p-12 relative">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-zinc-500 hover:text-white text-2xl">
          &times;
        </button>
        <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-8">
          Suggestion Box
        </h2>
        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="How can we make this better?"
          className="w-full h-40 bg-transparent border border-white/5 rounded-2xl p-6 text-white text-sm font-light outline-none focus:border-orange-500/30 transition-all resize-none"
        />
        <button
          onClick={handleSubmit}
          className="w-full mt-6 bg-white/5 hover:bg-white/10 text-white text-[9px] tracking-[0.4em] uppercase py-5 rounded-xl border border-white/10">
          Send into the Void
        </button>
      </div>
    </div>
  );
}