import React, { useState, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

export default function BottomDock({ 
  onAboutClick, 
  onContactClick, 
  onDonateClick,
  onPost, 
  isDark, 
  useCurrentLocation, 
  onLocationModeToggle,
  selectedLocation 
}) {
  const [inputText, setInputText] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  // Countdown Logic
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

const handlePost = async () => {
    if (!captchaToken || cooldown > 0 || !inputText.trim()) return;

    try {
      await onPost(inputText, captchaToken);
      setInputText("");
      setCaptchaToken(null); 
      setCooldown(10); 
      
      // ADD THIS LINE:
      // This resets the mode to GPS, which will hide the search/manual UI
      onLocationModeToggle(true); 
      
    } catch (err) {
      console.error("Post failed:", err);
    }
  };

  const getPlaceholder = () => {
    if (cooldown > 0) return `Wait ${cooldown}s...`;
    if (!useCurrentLocation && !selectedLocation) return "Click map or search to set location...";
    return "Share something unspoken...";
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-5xl px-3 flex flex-col items-center gap-3">
      
      {/* CAPTCHA - Only shows if there is text AND no cooldown */}
      {inputText.trim() && cooldown === 0 && (
        <div className="animate-bounce mb-1">
          <Turnstile 
            siteKey="0x4AAAAAACNNuHEbwy3hS-LX" 
            onSuccess={(token) => setCaptchaToken(token)}
            theme={isDark ? 'dark' : 'light'}
            key={cooldown > 0 ? "waiting" : "ready"} 
          />
        </div>
      )}

      {/* GPS / MANUAL TOGGLE SECTION */}
      {inputText.trim() && (
        <div className={`flex items-center gap-2 p-1 rounded-xl backdrop-blur-md border ${
          isDark ? 'bg-zinc-900/80 border-white/5' : 'bg-white/80 border-gray-200 shadow-sm'
        }`}>
          <button
            onClick={() => onLocationModeToggle(true)}
            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-tighter transition-all ${
              useCurrentLocation 
                ? 'bg-blue-600 text-white' 
                : isDark ? 'text-zinc-500' : 'text-gray-400'
            }`}
          >
            GPS Mode
          </button>
          <button
            onClick={() => onLocationModeToggle(false)}
            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-tighter transition-all ${
              !useCurrentLocation 
                ? 'bg-orange-600 text-white' 
                : isDark ? 'text-zinc-500' : 'text-gray-400'
            }`}
          >
            {selectedLocation ? "📍 Location Set" : "Select on Map"}
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full">
        <div className="flex gap-2">
          <button onClick={onAboutClick} className={`px-4 py-3 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${isDark ? 'bg-zinc-900/60 border-white/5 text-zinc-500' : 'bg-white border-gray-200 text-gray-500'}`}>
            About
          </button>
          <button onClick={onContactClick} className={`px-4 py-3 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${isDark ? 'bg-zinc-900/60 border-white/5 text-zinc-500' : 'bg-white border-gray-200 text-gray-500'}`}>
            Help
          </button>
          {/* NEW: Donation Button */}
          <button 
            onClick={onDonateClick} 
            className={`px-4 py-3 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${
              isDark 
                ? 'bg-amber-900/20 border-amber-500/20 text-amber-500 hover:bg-amber-900/40' 
                : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
            }`}
          >
            Donate
          </button>
        </div>

        <div className={`border p-1.5 rounded-2xl flex items-center backdrop-blur-3xl w-full sm:min-w-[450px] ${
          isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-gray-200 shadow-xl'
        }`}>
          <input
            value={inputText}
            disabled={cooldown > 0}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={getPlaceholder()}
            className={`flex-1 px-4 py-2 outline-none text-sm bg-transparent ${
              isDark ? 'text-white placeholder:text-zinc-700' : 'text-gray-900 placeholder:text-gray-400'
            } ${cooldown > 0 ? 'opacity-30' : ''}`}
          />
          
          <button
            onClick={handlePost}
            disabled={
              !inputText.trim() || 
              !captchaToken || 
              cooldown > 0 || 
              (!useCurrentLocation && !selectedLocation)
            }
            className={`px-6 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
              cooldown > 0 
                ? 'bg-zinc-500 text-white cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
            } disabled:opacity-20`}
          >
            {cooldown > 0 ? `${cooldown}s` : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}