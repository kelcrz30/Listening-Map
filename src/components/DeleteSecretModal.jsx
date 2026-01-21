import React, { useState } from 'react';

export default function DeleteSecretModal({ isOpen, onClose, onConfirm, isDark }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (pin.length !== 4) {
      setError('The PIN must be 4 digits');
      return;
    }
    onConfirm(pin);
    setPin('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />
      
      <div className={`relative max-w-xs w-full p-10 text-center transform transition-all animate-in zoom-in-95 duration-300 ${
        isDark 
          ? 'bg-zinc-950/60 border border-white/5 shadow-2xl' 
          : 'bg-white/90 border border-zinc-200 shadow-xl'
      } rounded-[2.5rem]`}>

        <h2 className={`text-[10px] uppercase tracking-[0.6em] mb-4 font-light ${
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        }`}>
          Release Silence
        </h2>

        <p className={`text-sm mb-8 font-serif italic leading-relaxed ${
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        }`}>
          "Should this thought fade back into the shadows?"
        </p>

        {/* PIN INPUT SECTION */}
        <div className="mb-8">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
            placeholder="••••"
            className={`w-full bg-transparent text-center text-2xl tracking-[0.5em] outline-none transition-all ${
              isDark ? 'text-white border-b border-white/10' : 'text-zinc-900 border-b border-zinc-200'
            } pb-2`}
            autoFocus
          />
          {error && <p className="text-[9px] text-red-500/60 uppercase tracking-widest mt-3">{error}</p>}
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleSubmit}
            className={`w-full py-4 text-[9px] uppercase tracking-[0.4em] transition-all border rounded-full ${
              isDark 
                ? 'border-red-900/30 text-red-400/60 hover:text-red-400 hover:bg-red-500/5' 
                : 'border-red-100 text-red-500 hover:bg-red-50'
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