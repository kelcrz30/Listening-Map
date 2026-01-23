import React, { useState } from 'react';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, isDark }) {
  const [pin, setPin] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.trim()) {
      onConfirm(pin); // Pass the PIN to the parent
      setPin(''); // Reset the input
    }
  };

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
        <p className={`text-sm mb-6 font-serif italic leading-relaxed ${
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        }`}>
          "Should this thought fade back into the shadows?"
        </p>

        {/* PIN Input */}
        <div className="mb-8">
          <label className={`block text-[8px] uppercase tracking-widest mb-3 ${
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            Enter your 4-digit key
          </label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength="4"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className={`w-full py-4 px-6 text-center text-2xl tracking-widest border rounded-2xl outline-none transition-all ${
              isDark 
                ? 'bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-red-500/30' 
                : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-red-300'
            }`}
            placeholder="••••"
            autoFocus
          />
        </div>

        {/* Minimal Buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={handleSubmit}
            disabled={pin.length !== 4}
            className={`w-full py-4 text-[9px] uppercase tracking-[0.4em] transition-all border rounded-full ${
              pin.length !== 4
                ? 'opacity-30 cursor-not-allowed'
                : isDark 
                  ? 'border-red-900/30 text-red-400/60 hover:text-red-400 hover:bg-red-500/5 active:scale-95' 
                  : 'border-red-100 text-red-400 hover:bg-red-50 active:scale-95'
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

        {/* Help Text */}
        <p className={`mt-6 text-[7px] uppercase tracking-wider opacity-30 ${
          isDark ? 'text-zinc-600' : 'text-zinc-400'
        }`}>
          The same key you created it with
        </p>
      </div>
    </div>
  );
}