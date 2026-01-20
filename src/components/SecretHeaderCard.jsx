import React from 'react';

// Simple time formatter included here so you don't need a separate file
const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
};

export default function SecretHeaderCard({ secret, isDark, onClose, onNod }) {
  if (!secret) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-[2000] animate-in fade-in slide-in-from-top-4 duration-500">
      <div className={`
        relative p-6 rounded-2xl shadow-2xl backdrop-blur-md border transition-colors
        ${isDark 
          ? 'bg-black/60 border-white/10 text-white shadow-orange-500/5' 
          : 'bg-white/80 border-black/5 text-gray-900'}
      `}>
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl opacity-30 hover:opacity-100">×</button>

        <div className="text-center space-y-4">
          <span className="text-[10px] uppercase tracking-[0.3em] opacity-40 block">
            A whisper from {formatTime(secret.created_at)}
          </span>

          <p className="text-lg md:text-2xl font-serif italic leading-relaxed px-4">
            "{secret.text}"
          </p>

          <div className="flex items-center justify-center gap-6 pt-2">
            <button onClick={() => onNod(secret.id, secret.nods)} className="flex items-center gap-2 group">
              <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] group-hover:scale-125 transition-transform" />
              <span className="text-[10px] uppercase tracking-widest opacity-60">
                {secret.nods || 0} Echoes
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}