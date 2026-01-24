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
  const [honeypot, setHoneypot] = useState("");
  
  // 📊 Post limit tracking
  const [dailyPostCount, setDailyPostCount] = useState(0);
  const [hourlyPostCount, setHourlyPostCount] = useState(0);
  
  const turnstileRef = useRef(null);

  const CHAR_LIMIT = 500;
  const MIN_TEXT_LENGTH = 2;
  const MIN_INTERVAL_MINUTES = 2;
  const EDGE_FUNCTION_URL = `https://zndkwygyxtbnlrpotgig.supabase.co/functions/v1/create-post`;
  
  // User limits (matches backend)
  const MAX_POSTS_PER_DAY = 30;
  const MAX_POSTS_PER_HOUR = 8;
  
  const isNearLimit = inputText.length > 450;
  const isNearDailyLimit = dailyPostCount >= MAX_POSTS_PER_DAY * 0.8;
  const isNearHourlyLimit = hourlyPostCount >= MAX_POSTS_PER_HOUR * 0.75;

  // Load post counts from localStorage
  useEffect(() => {
    const loadPostCounts = () => {
      const dailyData = localStorage.getItem('daily_posts');
      const hourlyData = localStorage.getItem('hourly_posts');
      
      if (dailyData) {
        const { count, date } = JSON.parse(dailyData);
        const today = new Date().toISOString().split('T')[0];
        if (date === today) {
          setDailyPostCount(count);
        } else {
          localStorage.setItem('daily_posts', JSON.stringify({ count: 0, date: today }));
          setDailyPostCount(0);
        }
      }
      
      if (hourlyData) {
        const { count, timestamp } = JSON.parse(hourlyData);
        const oneHourAgo = Date.now() - 3600000;
        if (timestamp > oneHourAgo) {
          setHourlyPostCount(count);
        } else {
          localStorage.removeItem('hourly_posts');
          setHourlyPostCount(0);
        }
      }
    };
    
    loadPostCounts();
    const interval = setInterval(loadPostCounts, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const updatePostCounts = () => {
    const today = new Date().toISOString().split('T')[0];
    const newDailyCount = dailyPostCount + 1;
    localStorage.setItem('daily_posts', JSON.stringify({ 
      count: newDailyCount, 
      date: today 
    }));
    setDailyPostCount(newDailyCount);
    
    const newHourlyCount = hourlyPostCount + 1;
    localStorage.setItem('hourly_posts', JSON.stringify({ 
      count: newHourlyCount, 
      timestamp: Date.now() 
    }));
    setHourlyPostCount(newHourlyCount);
  };

  const handlePost = async () => {
    if (!captchaToken || cooldown > 0 || !inputText.trim() || isPosting) return;

    if (dailyPostCount >= MAX_POSTS_PER_DAY) {
      setError(`Daily limit reached (${MAX_POSTS_PER_DAY} posts). Try again tomorrow.`);
      return;
    }
    
    if (hourlyPostCount >= MAX_POSTS_PER_HOUR) {
      setError(`Hourly limit reached (${MAX_POSTS_PER_HOUR} posts). Please wait.`);
      return;
    }

    if (honeypot.trim() !== "") {
      console.warn("🤖 Bot detected via honeypot");
      setIsPosting(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setInputText("");
      setPostPin("");
      setHoneypot("");
      setCaptchaToken(null);
      if (turnstileRef.current) turnstileRef.current.reset();
      setIsPosting(false);
      return;
    }

    setIsPosting(true);
    setError("");

    try {
      const trimmedText = inputText.trim();

      if (trimmedText.length < MIN_TEXT_LENGTH) {
        throw new Error(`Message must be at least ${MIN_TEXT_LENGTH} characters.`);
      }

      const filterResult = checkText(trimmedText);
      if (filterResult.isProfane) {
        throw new Error(`The void rejects this language. (${filterResult.count} forbidden word(s) detected)`);
      }

      const crisisCheck = checkForCrisisLanguage(trimmedText);
      if (crisisCheck.isCrisis && onCrisisDetected) onCrisisDetected();

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

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmedText,
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
          post_pin: (postPin && postPin.length === 4) ? postPin : null,
          turnstileToken: captchaToken,
          fingerprint: await generateFingerprint(),
          timestamp: Date.now(),
          honeypot: honeypot
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // 🔧 FIX: Only set cooldown if NOT a location/geofencing error
          const isLocationError = result.error?.includes('location') || result.error?.includes('area');
          
          if (!isLocationError) {
            const retrySecs = MIN_INTERVAL_MINUTES * 60;
            localStorage.setItem('post_cooldown', (Date.now() + retrySecs * 1000).toString());
            setCooldown(retrySecs);
          }
          
          // Sync counts with backend
          if (result.error?.includes('Daily limit')) {
            setDailyPostCount(MAX_POSTS_PER_DAY);
          } else if (result.error?.includes('slow down')) {
            setHourlyPostCount(MAX_POSTS_PER_HOUR);
          }
        }
        throw new Error(result.error || "Submission failed");
      }

      // Success - update counts
      updatePostCounts();

      const successCooldown = MIN_INTERVAL_MINUTES * 60; 
      localStorage.setItem('post_cooldown', (Date.now() + successCooldown * 1000).toString());
      setCooldown(successCooldown);

      setInputText("");
      setPostPin("");
      setHoneypot("");
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
      (useCurrentLocation || selectedLocation) &&
      dailyPostCount < MAX_POSTS_PER_DAY &&
      hourlyPostCount < MAX_POSTS_PER_HOUR
    );
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-5xl px-3 flex flex-col items-center gap-3">
      
      <input
        type="text"
        name="website_verification_hidden"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        autoComplete="off"
        data-lpignore="true"
        data-form-type="other"
        tabIndex={-1}
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          visibility: 'hidden'
        }}
        aria-hidden="true"
      />

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

      {(isNearDailyLimit || isNearHourlyLimit || dailyPostCount >= MAX_POSTS_PER_DAY || hourlyPostCount >= MAX_POSTS_PER_HOUR) && (
        <div className={`text-[10px] px-4 py-2 rounded-full backdrop-blur-md shadow-lg ${
          dailyPostCount >= MAX_POSTS_PER_DAY || hourlyPostCount >= MAX_POSTS_PER_HOUR
            ? 'bg-red-500/90 text-white animate-pulse'
            : 'bg-orange-500/90 text-white'
        }`}>
          {dailyPostCount >= MAX_POSTS_PER_DAY 
            ? `Daily limit reached (${dailyPostCount}/${MAX_POSTS_PER_DAY}). Try again tomorrow.`
            : hourlyPostCount >= MAX_POSTS_PER_HOUR
            ? `Hourly limit reached (${hourlyPostCount}/${MAX_POSTS_PER_HOUR}). Please wait.`
            : isNearDailyLimit
            ? `⚠️ Daily: ${dailyPostCount}/${MAX_POSTS_PER_DAY} posts used`
            : `⚠️ Hourly: ${hourlyPostCount}/${MAX_POSTS_PER_HOUR} posts used`
          }
        </div>
      )}

      {error && (
        <div className="bg-red-500/90 text-white text-[10px] px-4 py-2 rounded-full backdrop-blur-md shadow-lg animate-bounce">
          {error}
        </div>
      )}

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
            disabled={cooldown > 0 || isPosting || dailyPostCount >= MAX_POSTS_PER_DAY || hourlyPostCount >= MAX_POSTS_PER_HOUR}
            onChange={(e) => setInputText(e.target.value.slice(0, CHAR_LIMIT))}
            placeholder={
              dailyPostCount >= MAX_POSTS_PER_DAY ? "Daily limit reached..." :
              hourlyPostCount >= MAX_POSTS_PER_HOUR ? "Hourly limit reached..." :
              cooldown > 0 ? `Cooldown active...` : 
              "Share something unspoken..."
            }
            className={`flex-1 px-4 py-2 outline-none text-sm bg-transparent transition-colors ${
              isDark 
                ? 'text-white placeholder:text-zinc-600'
                : 'text-zinc-900 placeholder:text-zinc-400'
            } ${(cooldown > 0 || dailyPostCount >= MAX_POSTS_PER_DAY || hourlyPostCount >= MAX_POSTS_PER_HOUR) ? 'opacity-30' : 'opacity-100'}`}
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
              cooldown > 0 || dailyPostCount >= MAX_POSTS_PER_DAY || hourlyPostCount >= MAX_POSTS_PER_HOUR
                ? 'bg-zinc-800 text-zinc-600' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95'
            } disabled:opacity-20`}
          >
            {isPosting ? '...' : 
             dailyPostCount >= MAX_POSTS_PER_DAY || hourlyPostCount >= MAX_POSTS_PER_HOUR ? 'LIMIT' :
             cooldown > 0 ? `${Math.floor(cooldown/60)}:${(cooldown%60).toString().padStart(2,'0')}` : 
             'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}