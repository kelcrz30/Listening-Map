import React, { useState, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { generateFingerprint, checkRateLimit, logAction } from "../utils/antiSpam";
import { checkText } from "../utils/wordFilter";
import { supabase } from "../supabaseClient";
import { checkForCrisisLanguage } from '../utils/mentalHealthDetector';

export default function BottomDock({ 
  onAboutClick, 
  onContactClick, 
  onDonateClick,
  onPostSuccess, 
  isDark, 
  useCurrentLocation, 
  onLocationModeToggle,
  selectedLocation,
  onCrisisDetected  
}) {
  const [inputText, setInputText] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");

  // Load cooldown from localStorage on mount
  useEffect(() => {
    const savedCooldown = localStorage.getItem('post_cooldown');
    if (savedCooldown) {
      const remaining = Math.max(0, Math.floor((parseInt(savedCooldown) - Date.now()) / 1000));
      setCooldown(remaining);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            localStorage.removeItem('post_cooldown');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Clear error after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

 const handlePost = async () => {
    // 1. Basic validation
    if (!captchaToken || cooldown > 0 || !inputText.trim() || isPosting) return;

    setIsPosting(true);
    setError("");

    try {
      const trimmedText = inputText.trim();

      // 2. Mental Health / Crisis Check
      const crisisCheck = checkForCrisisLanguage(trimmedText); // FIX: Changed 'text' to 'trimmedText'
      if (crisisCheck.isCrisis) {
        if (onCrisisDetected) {
          onCrisisDetected(); // This triggers the modal in App.js
        }
        // NOTE: We don't 'return' here because we want them to be able to share, 
        // but they will see the help resources simultaneously.
      }

      // 3. Minimum length check
      if (trimmedText.length < 3) {
        setError("Message must be at least 3 characters.");
        setIsPosting(false);
        return;
      }

      // 4. Duplicate detection (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentPosts } = await supabase
        .from('unspoken_words')
        .select('text')
        .gte('created_at', fiveMinutesAgo)
        .ilike('text', trimmedText);

      if (recentPosts && recentPosts.length > 0) {
        setError('This message was recently posted. Please wait before posting again.');
        setIsPosting(false);
        return;
      }

      // 5. Get location
      let lat, lng;
      if (useCurrentLocation) {
        try {
          const pos = await new Promise((res, rej) => {
            navigator.geolocation.getCurrentPosition(res, rej, { 
              timeout: 10000,
              enableHighAccuracy: false 
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (geoError) {
          setError("Location access denied. Please enable location or select on map.");
          setIsPosting(false);
          return;
        }
      } else {
        if (!selectedLocation) {
          setError("Please select a location on the map.");
          setIsPosting(false);
          return;
        }
        lat = selectedLocation.lat;
        lng = selectedLocation.lng;
      }

      // 6. Insert to database
      const { data, error: dbError } = await supabase
        .from('unspoken_words')
        .insert([{
          text: trimmedText,
          lat: lat,
          lng: lng,
          is_listening: false,
          nods: 0,
          replies: []
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      // 7. Save ownership to localStorage
      const existingMySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
      if (data && data.id) {
        localStorage.setItem("my_secrets", JSON.stringify([...existingMySecrets, data.id]));
      }

      // 8. Log the action
      await logAction(supabase, fingerprint, 'post', navigator.userAgent);

      // 9. Set cooldown (persists across page refresh)
      const cooldownEnd = Date.now() + 10000;
      localStorage.setItem('post_cooldown', cooldownEnd.toString());
      setCooldown(10);

      // 10. Reset form
      setInputText("");
      setCaptchaToken(null); 
      onLocationModeToggle(true); 
      
      if (onPostSuccess) onPostSuccess(data);
      
    } catch (err) {
      console.error("Post failed:", err);
      setError("Failed to post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const getPlaceholder = () => {
    if (cooldown > 0) return `Wait ${cooldown}s...`;
    if (!useCurrentLocation && !selectedLocation) return "Set location on map first...";
    return "Share something unspoken...";
  };

  const charCount = inputText.length;
  const charLimit = 500;
  const isNearLimit = charCount > 450;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-5xl px-3 flex flex-col items-center gap-3">
      
      {/* Error Message */}
      {error && (
        <div className={`px-4 py-2 rounded-xl text-xs animate-bounce ${
          isDark 
            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
            : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          ⚠️ {error}
        </div>
      )}

      {/* Captcha */}
  {inputText.trim() && cooldown === 0 && (
  <div className="flex items-center gap-2 mb-1">
    <Turnstile 
      siteKey="0x4AAAAAACNNuHEbwy3hS-LX" 
      onSuccess={(token) => {
        setCaptchaToken(token);
      }}
      theme={isDark ? 'dark' : 'light'}
      key={cooldown > 0 ? "waiting" : "ready"} 
    />
    
    {/* Visual feedback when captcha is verified */}
    {captchaToken && (
      <span className="text-xs text-green-500 flex items-center gap-1 animate-fade-in">
        ✓ Verified
      </span>
    )}
  </div>
)}
      {/* Location Toggle */}
      {inputText.trim() && (
        <div className={`flex items-center gap-2 p-1 rounded-xl backdrop-blur-md border ${
          isDark ? 'bg-zinc-900/80 border-white/5' : 'bg-white/80 border-gray-200 shadow-sm'
        }`}>
          <button
            onClick={() => onLocationModeToggle(true)}
            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-tighter transition-all ${
              useCurrentLocation ? 'bg-blue-600 text-white' : isDark ? 'text-zinc-500' : 'text-gray-400'
            }`}
          >
            GPS Mode
          </button>
          <button
            onClick={() => onLocationModeToggle(false)}
            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-tighter transition-all ${
              !useCurrentLocation ? 'bg-orange-600 text-white' : isDark ? 'text-zinc-500' : 'text-gray-400'
            }`}
          >
            {selectedLocation ? "📍 Location Set" : "Select on Map"}
          </button>
        </div>
      )}

      {/* Main Dock */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full">
        <div className="flex gap-2">
          <button 
            onClick={onAboutClick} 
            className={`px-4 py-3 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${
              isDark ? 'bg-zinc-900/60 border-white/5 text-zinc-500 hover:bg-zinc-800/60' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            About
          </button>
          <button 
            onClick={onContactClick} 
            className={`px-4 py-3 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${
              isDark ? 'bg-zinc-900/60 border-white/5 text-zinc-500 hover:bg-zinc-800/60' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            Help
          </button>
          <button 
            onClick={onDonateClick} 
            className={`px-4 py-3 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${
              isDark ? 'bg-amber-900/20 border-amber-500/20 text-amber-500 hover:bg-amber-900/40' : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
            }`}
          >
            Donate
          </button>
        </div>

        {/* Input Area */}
        <div className={`border p-1.5 rounded-2xl flex items-center backdrop-blur-3xl w-full sm:min-w-[450px] relative ${
          isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-gray-200 shadow-xl'
        }`}>
          <input
            value={inputText}
            disabled={cooldown > 0 || isPosting}
            onChange={(e) => {
              if (e.target.value.length <= charLimit) {
                setInputText(e.target.value);
              }
            }}
            placeholder={getPlaceholder()}
            className={`flex-1 px-4 py-2 outline-none text-sm bg-transparent ${
              isDark ? 'text-white placeholder:text-zinc-700' : 'text-gray-900 placeholder:text-gray-400'
            } ${cooldown > 0 ? 'opacity-30' : ''}`}
          />
          
          {/* Character Counter */}
          {inputText && (
            <div className={`absolute right-24 text-[9px] font-mono transition-colors ${
              isNearLimit 
                ? 'text-orange-500 font-bold' 
                : isDark ? 'text-zinc-600' : 'text-gray-400'
            }`}>
              {charCount}/{charLimit}
            </div>
          )}
          
          <button
            onClick={handlePost}
            disabled={!inputText.trim() || !captchaToken || cooldown > 0 || isPosting || (!useCurrentLocation && !selectedLocation) || inputText.trim().length < 3}
            className={`px-6 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
              cooldown > 0 
                ? isDark 
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95'
            } disabled:opacity-20 disabled:cursor-not-allowed`}
          >
            {isPosting ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </span>
            ) : cooldown > 0 ? (
              `${cooldown}s`
            ) : (
              'Post'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}