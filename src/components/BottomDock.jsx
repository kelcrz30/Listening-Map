import React, { useState } from 'react';
import LocationModeToggle from './LocationModeToggle';
import { Turnstile } from '@marsidev/react-turnstile'; // Siguraduhing naka-install ito


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
  const [captchaToken, setCaptchaToken] = useState(null); // State para sa token

  const handlePost = () => {
    // Ipasa ang inputText at captchaToken sa handlePost ng App.jsx
    onPost(inputText, captchaToken);
    setInputText("");
    // Opsyonal: wag i-reset ang token dito para kung mag-fail ang post, di na uulit ng captcha agad
  };

  const getPlaceholder = () => {
    if (useCurrentLocation) {
      return "Share something unspoken...";
    }
    if (selectedLocation) {
      return "📍 Location set! Write your message...";
    }
    return "First, click on the map to choose location...";
  };

  return (
    <div className="fixed bottom-4 sm:bottom-12 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-5xl px-3 sm:px-6 flex flex-col items-center justify-center gap-3">
      
      {/* CAPTCHA Widget - Lalabas lang kapag may sinusulat na */}
      {inputText.trim() && (
        <div className="animate-fade-in-up mb-1">
          <Turnstile 
            siteKey="0x4AAAAAACNNuHEbwy3hS-LX" 
            onSuccess={(token) => setCaptchaToken(token)}
            theme={isDark ? 'dark' : 'light'}
          />
        </div>
      )}

      {/* Location Mode Selector */}
      {inputText.trim() && (
        <div className="w-full sm:w-auto flex justify-center animate-fade-in-up">
          <LocationModeToggle 
            useCurrentLocation={useCurrentLocation}
            onToggle={onLocationModeToggle}
            isDark={isDark}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 w-full">
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-center">
          <button
            onClick={onAboutClick}
            className={`backdrop-blur-md border text-[8px] sm:text-[9px] tracking-[0.3em] uppercase px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all ${
              isDark 
                ? 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5 text-zinc-500 hover:text-white' 
                : 'bg-white/80 hover:bg-white border-gray-200 text-gray-600 hover:text-gray-900 shadow-lg'
            }`}>
            About
          </button>
          <button
            onClick={onContactClick}
            className={`backdrop-blur-md border text-[8px] sm:text-[9px] tracking-[0.3em] uppercase px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all ${
              isDark 
                ? 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5 text-zinc-500 hover:text-white' 
                : 'bg-white/80 hover:bg-white border-gray-200 text-gray-600 hover:text-gray-900 shadow-lg'
            }`}>
            Suggestions
          </button>
          <button
            onClick={onDonateClick}
            className={`backdrop-blur-md border text-[8px] sm:text-[9px] tracking-[0.3em] uppercase px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all ${
              isDark 
                ? 'bg-amber-900/40 hover:bg-amber-800/60 border-amber-500/20 text-amber-400 hover:text-amber-300' 
                : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 hover:text-amber-900 shadow-lg'
            }`}>
            Support
          </button>
        </div>

        <div className={`border p-1.5 sm:p-2 rounded-xl sm:rounded-2xl flex items-center backdrop-blur-3xl w-full sm:min-w-[450px] ${
          isDark 
            ? 'bg-zinc-900/40 border-white/5' 
            : 'bg-white/80 border-gray-200 shadow-2xl'
        }`}>
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={getPlaceholder()}
            className={`flex-1 px-3 sm:px-5 py-2.5 sm:py-3 outline-none text-xs sm:text-sm bg-transparent font-light ${
              isDark 
                ? 'text-white placeholder:text-zinc-700' 
                : 'text-gray-900 placeholder:text-gray-400'
            }`}
          />
          <button
            onClick={handlePost}

            disabled={!inputText.trim() || (!useCurrentLocation && !selectedLocation) || !captchaToken}
            className={`text-[8px] sm:text-[9px] font-bold px-4 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl uppercase tracking-[0.3em] sm:tracking-[0.4em] border transition-all ${
              isDark 
                ? 'bg-white/5 hover:bg-white/10 text-white border-white/10 disabled:opacity-30 disabled:cursor-not-allowed' 
                : 'bg-gray-900 hover:bg-gray-800 text-white border-gray-900 disabled:opacity-30 disabled:cursor-not-allowed'
            }`}>
            Post
          </button>
        </div>
      </div>
    </div>
  );
}