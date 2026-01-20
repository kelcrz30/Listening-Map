import React, { useState, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { generateFingerprint, logAction } from "../utils/antiSpam";
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

  const charLimit = 500;
  const isNearLimit = inputText.length > 450;

  // 1. Load cooldown from localStorage on mount to prevent refresh bypass
  useEffect(() => {
    const savedCooldown = localStorage.getItem('post_cooldown');
    if (savedCooldown) {
      const remaining = Math.max(0, Math.floor((parseInt(savedCooldown) - Date.now()) / 1000));
      setCooldown(remaining);
    }
  }, []);

  // 2. Cooldown Timer Logic
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

  // 3. Auto-hide errors
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handlePost = async () => {
    // Basic validation
    if (!captchaToken || cooldown > 0 || !inputText.trim() || isPosting) return;

    setIsPosting(true);
    setError("");

    try {
      const trimmedText = inputText.trim();

      // Crisis Check
      const crisisCheck = checkForCrisisLanguage(trimmedText);
      if (crisisCheck.isCrisis && onCrisisDetected) {
        onCrisisDetected(); 
      }

      if (trimmedText.length < 3) {
        setError("Message must be at least 3 characters.");
        setIsPosting(false);
        return;
      }

      // Duplicate detection (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentPosts } = await supabase
        .from('unspoken_words')
        .select('text')
        .gte('created_at', fiveMinutesAgo)
        .ilike('text', trimmedText);

      if (recentPosts && recentPosts.length > 0) {
        setError('This message was recently posted.');
        setIsPosting(false);
        return;
      }

      // Handle Geolocation
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
          setError("Location access denied. Please select on map.");
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

      // Insert to Supabase
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

      // Save ownership
      const existingMySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
      if (data?.id) {
        localStorage.setItem("my_secrets", JSON.stringify([...existingMySecrets, data.id]));
      }

      // Anti-Spam Logging
      const fingerprint = await generateFingerprint();
      await logAction(supabase, fingerprint, 'post', navigator.userAgent);

      // SET COOLDOWN TO 60 SECONDS
      const cooldownDuration = 60; 
      const cooldownEnd = Date.now() + (cooldownDuration * 1000);
      localStorage.setItem('post_cooldown', cooldownEnd.toString());
      setCooldown(cooldownDuration);

      // Reset UI
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
    if (cooldown > 0) return `Let the tides settle... (${cooldown}s)`;
    if (!useCurrentLocation && !selectedLocation) return "Set location on map first...";
    return "Share something unspoken...";
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-5xl px-3 flex flex-col items-center gap-3">
      
      {/* Turnstile Captcha */}
      {inputText.trim() && cooldown === 0 && (
        <div className="flex items-center gap-2 mb-1">
          <Turnstile 
            siteKey="0x4AAAAAACNNuHEbwy3hS-LX" 
            onSuccess={(token) => setCaptchaToken(token)}
            theme={isDark ? 'dark' : 'light'}
            key={cooldown > 0 ? "waiting" : "ready"} 
          />
          {captchaToken && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              ✓ Verified
            </span>
          )}
        </div>
      )}

      {/* Error Message Toast */}
      {error && (
        <div className="bg-red-500/90 text-white text-[10px] px-4 py-2 rounded-full backdrop-blur-md animate-bounce">
          {error}
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
              useCurrentLocation ? 'bg-indigo-600 text-white' : isDark ? 'text-zinc-500' : 'text-gray-400'
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
          {['About', 'Help', 'Donate'].map((label) => (
            <button 
              key={label}
              onClick={label === 'About' ? onAboutClick : label === 'Help' ? onContactClick : onDonateClick} 
              className={`px-4 py-3 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${
                label === 'Donate' 
                  ? isDark ? 'bg-amber-900/20 border-amber-500/20 text-amber-500 hover:bg-amber-900/40' : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                  : isDark ? 'bg-zinc-900/60 border-white/5 text-zinc-500 hover:bg-zinc-800/60' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={`border p-1.5 rounded-2xl flex items-center backdrop-blur-3xl w-full sm:min-w-[450px] relative ${
          isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-gray-200 shadow-xl'
        }`}>
          <input
            value={inputText}
            disabled={cooldown > 0 || isPosting}
            onChange={(e) => e.target.value.length <= charLimit && setInputText(e.target.value)}
            placeholder={getPlaceholder()}
            className={`flex-1 px-4 py-2 outline-none text-sm bg-transparent ${
              isDark ? 'text-white placeholder:text-zinc-700' : 'text-gray-900 placeholder:text-gray-400'
            } ${cooldown > 0 ? 'opacity-30' : ''}`}
          />
          
          {inputText && (
            <div className={`absolute right-24 text-[9px] font-mono transition-colors ${
              isNearLimit ? 'text-orange-500 font-bold' : isDark ? 'text-zinc-600' : 'text-gray-400'
            }`}>
              {inputText.length}/{charLimit}
            </div>
          )}
          
          <button
            onClick={handlePost}
            disabled={!inputText.trim() || !captchaToken || cooldown > 0 || isPosting || (!useCurrentLocation && !selectedLocation) || inputText.trim().length < 3}
            className={`px-6 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
              cooldown > 0 
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95'
            } disabled:opacity-20 disabled:cursor-not-allowed`}
          >
            {isPosting ? '...' : cooldown > 0 ? `${cooldown}s` : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}