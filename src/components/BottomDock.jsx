import React, { useState, useEffect, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { generateFingerprint, logAction } from "../utils/antiSpam";
import { checkForCrisisLanguage } from '../utils/mentalHealthDetector';
import L from 'leaflet';
import { checkText } from "../utils/wordFilter";

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
  const [postPin, setPostPin] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");
  const turnstileRef = useRef(null);

  // --- ALIGNED CONSTANTS ---
  const CHAR_LIMIT = 500; // Matches MAX_TEXT_LENGTH in Edge Function
  const MIN_TEXT_LENGTH = 2; // Matches MIN_TEXT_LENGTH in Edge Function
  const MIN_INTERVAL_MINUTES = 2; // Matches MIN_INTERVAL_MINUTES in Edge Function
  const EDGE_FUNCTION_URL = `https://zndkwygyxtbnlrpotgig.supabase.co/functions/v1/create-post`;
  
  const isNearLimit = inputText.length > 450;

  // Load cooldown from localStorage
  useEffect(() => {
    const savedCooldown = localStorage.getItem('post_cooldown');
    if (savedCooldown) {
      const remaining = Math.max(0, Math.floor((parseInt(savedCooldown) - Date.now()) / 1000));
      setCooldown(remaining);
    }
  }, []);

  // Cooldown timer logic
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

  const handlePost = async () => {
    if (!captchaToken || cooldown > 0 || !inputText.trim() || isPosting) return;

    setIsPosting(true);
    setError("");

    try {
      const trimmedText = inputText.trim();

      // 1. Validation
      if (trimmedText.length < MIN_TEXT_LENGTH) {
        throw new Error(`Message must be at least ${MIN_TEXT_LENGTH} characters.`);
      }

      // --- ADD THE PROFANITY CHECK HERE ---
    const filterResult = checkText(trimmedText);
    if (filterResult.isProfane) {
      // This stops the function and shows the error to the user
      throw new Error(`The void rejects this language. (${filterResult.count} forbidden word(s) detected)`);
    }

      // 2. Mental Health Check
      const crisisCheck = checkForCrisisLanguage(trimmedText);
      if (crisisCheck.isCrisis && onCrisisDetected) onCrisisDetected();

      // 3. Location Handling
      let lat, lng;
      if (useCurrentLocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } else {
        if (!selectedLocation) throw new Error("Please select a location on the map first.");
        lat = selectedLocation.lat;
        lng = selectedLocation.lng;
      }

      // 4. Send to Edge Function
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmedText,
          lat: parseFloat(lat.toFixed(6)), // Precise matching for backend
          lng: parseFloat(lng.toFixed(6)),
          post_pin: (postPin && postPin.length === 4) ? postPin : null,
          turnstileToken: captchaToken,
          fingerprint: await generateFingerprint(),
          timestamp: Date.now() 
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // If server says we are rate limited (429)
        if (response.status === 429) {
          const retrySecs = MIN_INTERVAL_MINUTES * 60;
          localStorage.setItem('post_cooldown', (Date.now() + retrySecs * 1000).toString());
          setCooldown(retrySecs);
        }
        throw new Error(result.error || "Submission failed");
      }

      // 5. Success Sequence
      const successCooldown = MIN_INTERVAL_MINUTES * 60; 
      localStorage.setItem('post_cooldown', (Date.now() + successCooldown * 1000).toString());
      setCooldown(successCooldown);

      setInputText("");
      setPostPin("");
      setCaptchaToken(null);
      if (turnstileRef.current) turnstileRef.current.reset();

      if (onPostSuccess) onPostSuccess(result.post);
      logAction('post_created');

    } catch (err) {
      setError(err.message);
      if (turnstileRef.current) turnstileRef.current.reset();
    } finally {
      setIsPosting(false);
    }
  };

  const canPost = () => {
    return (
      inputText.trim().length >= MIN_TEXT_LENGTH &&
      inputText.length <= CHAR_LIMIT &&
      captchaToken &&
      cooldown === 0 &&
      !isPosting &&
      (useCurrentLocation || selectedLocation)
    );
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-5xl px-3 flex flex-col items-center gap-3">
      
      {/* Turnstile - Only show when user starts typing */}
      {inputText.trim() && cooldown === 0 && (
        <div className="mb-1">
          <Turnstile 
            ref={turnstileRef}
            siteKey="0x4AAAAAACNNuHEbwy3hS-LX" 
            onSuccess={(token) => setCaptchaToken(token)}
            theme={isDark ? 'dark' : 'light'}
            size="compact"
          />
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="bg-red-500/90 text-white text-[10px] px-4 py-2 rounded-full backdrop-blur-md shadow-lg animate-bounce">
          {error}
        </div>
      )}

      {/* Location & PIN Controls */}
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

          <div className={`flex items-center px-3 py-1.5 rounded-xl backdrop-blur-md border ${
            isDark ? 'bg-zinc-900/80 border-white/5' : 'bg-white/80 border-gray-200 shadow-sm'
          }`}>
            <span className="text-[9px] uppercase tracking-tighter text-zinc-500 mr-2">PIN:</span>
            <input 
              type="password"
              maxLength={4}
              value={postPin}
              onChange={(e) => setPostPin(e.target.value.replace(/\D/g, ""))}
              placeholder="----"
              className="bg-transparent w-12 text-xs outline-none font-mono text-center"
            />
          </div>
        </div>
      )}

      {/* Main Input Dock */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full">
        <div className="flex gap-2">
          {['About', 'Help', 'Donate'].map((label) => (
            <button 
              key={label}
              onClick={label === 'About' ? onAboutClick : label === 'Help' ? onContactClick : onDonateClick} 
              className={`px-4 py-3 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${
                label === 'Donate' 
                  ? isDark ? 'bg-amber-900/20 border-amber-500/20 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-600'
                  : isDark ? 'bg-zinc-900/60 border-white/5 text-zinc-500' : 'bg-white border-gray-200 text-gray-500'
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
  onChange={(e) => setInputText(e.target.value.slice(0, CHAR_LIMIT))}
  placeholder={cooldown > 0 ? `Cooldown active...` : "Share something unspoken..."}
  className={`flex-1 px-4 py-2 outline-none text-sm bg-transparent transition-colors ${
    isDark 
      ? 'text-white placeholder:text-zinc-600' // Dark mode: White text, dim gray placeholder
      : 'text-zinc-900 placeholder:text-zinc-400' // Light mode: Dark text, light gray placeholder
  } ${cooldown > 0 ? 'opacity-30' : 'opacity-100'}`}
/>

          {inputText && (
            <div className={`absolute right-24 text-[9px] font-mono ${isNearLimit ? 'text-orange-500 font-bold' : 'text-zinc-500'}`}>
              {inputText.length}/{CHAR_LIMIT}
            </div>
          )}
          
          <button
            onClick={handlePost}
            disabled={!canPost()}
            className={`px-6 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
              cooldown > 0 
                ? 'bg-zinc-800 text-zinc-600' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95'
            } disabled:opacity-20`}
          >
            {isPosting ? '...' : cooldown > 0 ? `${Math.floor(cooldown/60)}:${(cooldown%60).toString().padStart(2,'0')}` : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}