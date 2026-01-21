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
  const [postPin, setPostPin] = useState(""); // Optional PIN
  const [captchaToken, setCaptchaToken] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");

  const charLimit = 500;
  const isNearLimit = inputText.length > 450;

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

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

 const handlePost = async () => {
  if (!captchaToken || cooldown > 0 || !inputText.trim() || isPosting) return;

  setIsPosting(true);
  setError("");

  try {
    const trimmedText = inputText.trim();
    if (trimmedText.length < 3) {
      setError("Message must be at least 3 characters.");
      setIsPosting(false);
      return;
    }

    // Crisis check remains same
    const crisisCheck = checkForCrisisLanguage(trimmedText);
    if (crisisCheck.isCrisis && onCrisisDetected) onCrisisDetected();

    // Get Coordinates
    let lat, lng;
    if (useCurrentLocation) {
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } else {
      if (!selectedLocation) {
        setError("Please select a location on the map.");
        setIsPosting(false);
        return;
      }
      lat = selectedLocation.lat;
      lng = selectedLocation.lng;
    }

    // Prepare Data - Matching your DB screenshot columns
    const insertData = {
      text: trimmedText,
      lat: lat,
      lng: lng,
      is_listening: false, // Matches image_f339ca.png
      nods: 0,
      replies: [],
      author_role: "Anonymous", // Optional: fixes the "Anonymouse" typo
      post_pin: postPin.length === 4 ? postPin : null, // Uses column from image_f33c94.png
      is_visible: true
    };

    const { data, error: dbError } = await supabase
      .from('unspoken_words')
      .insert([insertData])
      .select();

    if (dbError) throw dbError;

    // COOLDOWN & CLEANUP
    const cooldownDuration = 60; 
    localStorage.setItem('post_cooldown', (Date.now() + cooldownDuration * 1000).toString());
    setCooldown(cooldownDuration);
    setInputText("");
    setPostPin(""); 
    setCaptchaToken(null); 
    
    if (onPostSuccess) onPostSuccess(data?.[0]);
    
  } catch (err) {
    console.error("Post failed:", err);
    setError("Failed to post. The void is busy, try again.");
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

      {/* Location Toggle & PIN Input */}
      {inputText.trim() && (
        <div className="flex flex-wrap justify-center items-center gap-2">
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

          {/* ✅ PIN Input - Now Optional */}
          <div className={`flex items-center px-3 py-1.5 rounded-xl backdrop-blur-md border ${
            isDark ? 'bg-zinc-900/80 border-white/5' : 'bg-white/80 border-gray-200 shadow-sm'
          }`}>
            <span className="text-[9px] uppercase tracking-tighter text-zinc-500 mr-2">
              {postPin.length === 4 ? '🔒' : '♾️'} PIN:
            </span>
<input 
  type="password"
  maxLength={4}
  value={postPin}
  onChange={(e) => setPostPin(e.target.value.replace(/\D/g, ""))}
  placeholder="4-digits" // Changed from "Optional" to be clearer
  className={`bg-transparent w-16 text-xs outline-none font-mono tracking-widest text-center ${
    postPin.length > 0 && postPin.length < 4 ? 'text-red-500' : 'text-inherit'
  }`}
/>
          </div>
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
            title={
              !inputText.trim() ? "Enter a message" :
              inputText.trim().length < 3 ? "Message too short (min 3 chars)" :
              !captchaToken ? "Complete the captcha first" :
              cooldown > 0 ? `Wait ${cooldown}s` :
              !useCurrentLocation && !selectedLocation ? "Select a location" :
              "Ready to post!"
            }
          >
            {isPosting ? '...' : cooldown > 0 ? `${cooldown}s` : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}