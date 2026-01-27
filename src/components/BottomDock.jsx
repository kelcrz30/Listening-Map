import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

function getOrCreateStableId(key = "uw_fingerprint") {
  let id = localStorage.getItem(key);
  if (!id) {
    id = (crypto?.randomUUID?.() || `fp_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(key, id);
  }
  return id;
}

export default function BottomDock({
  onAboutClick,
  onContactClick,
  onDonateClick,
  onSearchClick,
  onPostSuccess,
  isDark,
  useCurrentLocation,
  onLocationModeToggle,
  selectedLocation,
}) {
  const [inputText, setInputText] = useState("");
  const [postPin, setPostPin] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [firstKeystroke, setFirstKeystroke] = useState(null);
  const [keystrokeTimestamps, setKeystrokeTimestamps] = useState([]);
  const [hasPointerMoved, setHasPointerMoved] = useState(false);
  const [interactionScore, setInteractionScore] = useState(0);

  const [dailyPostCount, setDailyPostCount] = useState(0);
  const [hourlyPostCount, setHourlyPostCount] = useState(0);

  const inputRef = useRef(null);
  const turnstileDivRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const turnstileReadyRef = useRef(false);

  const CHAR_LIMIT = 500;
  const MIN_TEXT_LENGTH = 2;
  const IS_DEV = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const MIN_INTERVAL_MINUTES = IS_DEV ? 0 : 2;
  const EDGE_FUNCTION_URL = "/api/create-post";
  const MAX_POSTS_PER_DAY = 30;
  const MAX_POSTS_PER_HOUR = 25;

  const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const fingerprint = useMemo(() => getOrCreateStableId(), []);

  const isNearLimit = inputText.length > 450;
  const isNearDailyLimit = dailyPostCount >= MAX_POSTS_PER_DAY * 0.8;
  const isNearHourlyLimit = hourlyPostCount >= MAX_POSTS_PER_HOUR * 0.75;

  // Turnstile setup
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    const scriptId = "cf-turnstile-script";
    let script = document.getElementById(scriptId);
    const onLoad = () => {
      turnstileReadyRef.current = true;
      renderTurnstile();
    };
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true; 
      script.defer = true; 
      script.onload = onLoad;
      document.head.appendChild(script);
    } else {
      if (window.turnstile) onLoad();
      else script.addEventListener("load", onLoad, { once: true });
    }
    return () => script?.removeEventListener?.("load", onLoad);
  }, [TURNSTILE_SITE_KEY]);

  const removeTurnstile = () => {
    try { 
      if (window.turnstile && turnstileWidgetIdRef.current != null) {
        window.turnstile.remove(turnstileWidgetIdRef.current); 
      }
    } catch {}
    turnstileWidgetIdRef.current = null;
  };

  const renderTurnstile = () => {
    if (!TURNSTILE_SITE_KEY || !turnstileReadyRef.current || !window.turnstile || !turnstileDivRef.current) return;
    const shouldShow = inputText.trim().length > 0 && cooldown === 0;
    if (!shouldShow) { 
      removeTurnstile(); 
      setCaptchaToken(null); 
      return; 
    }
    if (turnstileWidgetIdRef.current != null) return;
    setCaptchaToken(null);
    turnstileWidgetIdRef.current = window.turnstile.render(turnstileDivRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: isDark ? "dark" : "light",
      callback: (token) => setCaptchaToken(token || null),
      "expired-callback": () => setCaptchaToken(null),
      "error-callback": () => setCaptchaToken(null),
    });
  };

  useEffect(() => { 
    renderTurnstile(); 
  }, [inputText, cooldown, isDark]);

  // Human signal collection
  useEffect(() => {
    let count = 0;
    const onMove = () => {
      count++;
      if (count > 6 && !hasPointerMoved) { 
        setHasPointerMoved(true); 
        setInteractionScore((p) => p + 2); 
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [hasPointerMoved]);

  const onFocus = () => setInteractionScore((p) => p + 1);

  // Load counters
  useEffect(() => {
    const loadCounts = () => {
      const today = new Date().toISOString().split("T")[0];
      const dailyData = JSON.parse(localStorage.getItem("daily_posts") || "{}");
      if (dailyData.date === today) setDailyPostCount(dailyData.count || 0);
      const hourlyData = JSON.parse(localStorage.getItem("hourly_posts") || "{}");
      if (hourlyData.timestamp > Date.now() - 3600000) setHourlyPostCount(hourlyData.count || 0);
    };
    loadCounts();
    const interval = setInterval(loadCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load cooldown
  useEffect(() => {
    const saved = localStorage.getItem("post_cooldown");
    if (saved) {
      const remaining = Math.max(0, Math.floor((parseInt(saved, 10) - Date.now()) / 1000));
      setCooldown(remaining);
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { 
          localStorage.removeItem("post_cooldown"); 
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const updatePostCounts = () => {
    const today = new Date().toISOString().split("T")[0];
    const newDaily = dailyPostCount + 1;
    localStorage.setItem("daily_posts", JSON.stringify({ count: newDaily, date: today }));
    setDailyPostCount(newDaily);
    const newHourly = hourlyPostCount + 1;
    localStorage.setItem("hourly_posts", JSON.stringify({ count: newHourly, timestamp: Date.now() }));
    setHourlyPostCount(newHourly);
  };

  const calculateTypingMetrics = () => {
    if (keystrokeTimestamps.length < 2) {
      return { 
        avgSpeed: 0, 
        variance: 0, 
        totalTypingTime: firstKeystroke ? Date.now() - firstKeystroke : 0 
      };
    }
    const intervals = keystrokeTimestamps.slice(1).map((t, i) => t - keystrokeTimestamps[i]);
    const avgSpeed = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, x) => sum + (x - avgSpeed) ** 2, 0) / intervals.length;
    return { 
      avgSpeed, 
      variance, 
      totalTypingTime: Date.now() - firstKeystroke 
    };
  };

  const canPost = () =>
    inputText.trim().length >= MIN_TEXT_LENGTH &&
    inputText.length <= CHAR_LIMIT &&
    !!captchaToken &&
    cooldown === 0 &&
    !isPosting &&
    (useCurrentLocation || selectedLocation) &&
    dailyPostCount < MAX_POSTS_PER_DAY &&
    hourlyPostCount < MAX_POSTS_PER_HOUR;

  const handleTextChange = (e) => {
    const newValue = e.target.value.slice(0, CHAR_LIMIT);
    if (!firstKeystroke && newValue.length === 1) setFirstKeystroke(Date.now());
    if (newValue.length > inputText.length) {
      setKeystrokeTimestamps((prev) => [...prev, Date.now()].slice(-50));
    }
    if (newValue.length === 0) { 
      setFirstKeystroke(null); 
      setKeystrokeTimestamps([]); 
    }
    setInputText(newValue);
  };

  // ✅ FIXED: Now properly uses auth token
  const handlePost = async () => {
    if (!canPost()) return;

    // Honeypot check
    if (honeypot.trim() !== "") {
      setIsPosting(true);
      await new Promise((r) => setTimeout(r, 900));
      setInputText(""); 
      setPostPin(""); 
      setHoneypot("");
      setCaptchaToken(null); 
      removeTurnstile(); 
      setIsPosting(false);
      return;
    }

    setIsPosting(true);
    setError("");

    try {
      // ✅ Get the auth token FIRST
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // ✅ If no session, try to create one
      if (!token) {
        console.log("⚠️ No session found, creating anonymous session...");
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          throw new Error("Failed to authenticate. Please refresh the page.");
        }
        // Get the new session
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (!newSession?.access_token) {
          throw new Error("Authentication failed. Please refresh the page.");
        }
      }

      // Get location
      let lat, lng;
      if (useCurrentLocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } else {
        lat = selectedLocation.lat;
        lng = selectedLocation.lng;
      }

      // Get fresh token after potential sign-in
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      const finalToken = finalSession?.access_token;

      if (!finalToken) {
        throw new Error("Authentication required. Please refresh the page.");
      }

      const metrics = calculateTypingMetrics();
      
      // ✅ NOW we include the Authorization header
      const resp = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${finalToken}`, // ✅ THIS WAS MISSING
        },
        body: JSON.stringify({
          text: inputText.trim(),
          lat: parseFloat(Number(lat).toFixed(6)),
          lng: parseFloat(Number(lng).toFixed(6)),
          post_pin: postPin?.length === 4 ? postPin : null,
          turnstileToken: captchaToken,
          fingerprint,
          timestamp: Date.now(),
          honeypot,
          requestId: crypto?.randomUUID?.() || `req_${Date.now()}`,
          behaviorMetrics: {
            typingSpeed: metrics.avgSpeed,
            typingVariance: metrics.variance,
            totalTypingTime: metrics.totalTypingTime,
            keystrokeCount: keystrokeTimestamps.length,
            hasPointerMovement: hasPointerMoved,
            interactionScore,
          },
        }),
      });

      const result = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        if (resp.status === 429) {
          const wait = result.waitSeconds || (MIN_INTERVAL_MINUTES * 60);
          if (!IS_DEV) {
            localStorage.setItem("post_cooldown", String(Date.now() + wait * 1000));
            setCooldown(wait);
          }
        }
        throw new Error(result?.error || "Please try again later.");
      }

      updatePostCounts();
      const cd = result.cooldownSeconds || (MIN_INTERVAL_MINUTES * 60);
      if (!IS_DEV) {
        localStorage.setItem("post_cooldown", String(Date.now() + cd * 1000));
        setCooldown(cd);
      }

      setInputText(""); 
      setPostPin(""); 
      setHoneypot(""); 
      setCaptchaToken(null);
      setFirstKeystroke(null); 
      setKeystrokeTimestamps([]); 
      setHasPointerMoved(false);
      setInteractionScore(0); 
      removeTurnstile();

      if (onPostSuccess) onPostSuccess(result.post);
    } catch (e) {
      console.error("❌ Post error:", e);
      setError(e?.message || "Please try again later.");
      setCaptchaToken(null);
      if (window.turnstile && turnstileWidgetIdRef.current) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-5xl px-3 flex flex-col items-center gap-3">
      <input
        type="text"
        name="website_verification_hidden"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        autoComplete="off"
        tabIndex={-1}
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
          visibility: "hidden",
        }}
        aria-hidden="true"
      />

      {inputText.trim() && cooldown === 0 && (
        <div className="mb-1 text-xs text-center">
          <div
            className={`${
              isDark ? "bg-zinc-900/70" : "bg-gray-200"
            } px-3 py-2 rounded`}
          >
            {!TURNSTILE_SITE_KEY ? (
              <div className="text-[11px] text-red-500">
                Missing VITE_TURNSTILE_SITE_KEY
              </div>
            ) : (
              <div ref={turnstileDivRef} />
            )}
          </div>
        </div>
      )}

      {(isNearDailyLimit ||
        isNearHourlyLimit ||
        dailyPostCount >= MAX_POSTS_PER_DAY ||
        hourlyPostCount >= MAX_POSTS_PER_HOUR) && (
        <div
          className={`text-[10px] px-4 py-2 rounded-full backdrop-blur-md shadow-lg ${
            dailyPostCount >= MAX_POSTS_PER_DAY ||
            hourlyPostCount >= MAX_POSTS_PER_HOUR
              ? "bg-red-500/90 text-white animate-pulse"
              : "bg-orange-500/90 text-white"
          }`}
        >
          {dailyPostCount >= MAX_POSTS_PER_DAY
            ? `Daily limit reached (${dailyPostCount}/${MAX_POSTS_PER_DAY}). Try again tomorrow.`
            : hourlyPostCount >= MAX_POSTS_PER_HOUR
            ? `Hourly limit reached (${hourlyPostCount}/${MAX_POSTS_PER_HOUR}). Please wait.`
            : isNearDailyLimit
            ? `⚠️ Daily: ${dailyPostCount}/${MAX_POSTS_PER_DAY} posts used`
            : `⚠️ Hourly: ${hourlyPostCount}/${MAX_POSTS_PER_HOUR} posts used`}
        </div>
      )}

      {error && (
        <div className="bg-red-500/90 text-white text-[10px] px-4 py-2 rounded-full backdrop-blur-md shadow-lg">
          {error}
        </div>
      )}

      {inputText.trim() && (
        <div className="flex flex-wrap justify-center items-center gap-2">
          <div
            className={`flex items-center gap-2 p-1 rounded-xl backdrop-blur-md border ${
              isDark
                ? "bg-zinc-900/80 border-white/5"
                : "bg-white/80 border-gray-200 shadow-sm"
            }`}
          >
            <button
              onClick={() => onLocationModeToggle(true)}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-tighter transition-all ${
                useCurrentLocation
                  ? "bg-indigo-600 text-white"
                  : isDark
                  ? "text-zinc-500"
                  : "text-gray-400"
              }`}
            >
              GPS Mode
            </button>
            <button
              onClick={() => onLocationModeToggle(false)}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-tighter transition-all ${
                !useCurrentLocation
                  ? "bg-orange-600 text-white"
                  : isDark
                  ? "text-zinc-500"
                  : "text-gray-400"
              }`}
            >
              {selectedLocation ? "📍 Location Set" : "Select on Map"}
            </button>
          </div>

          <div
            className={`flex items-center px-3 py-1.5 rounded-xl backdrop-blur-md border ${
              isDark
                ? "bg-zinc-900/80 border-white/5"
                : "bg-white/80 border-gray-200 shadow-sm"
            }`}
          >
            <span className="text-[9px] uppercase tracking-tighter text-zinc-500 mr-2">
              PIN:
            </span>
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
          {[
            { label: "About", onClick: onAboutClick },
            { label: "Help", onClick: onContactClick },
            { label: "Donate", onClick: onDonateClick },
            ...(onSearchClick ? [{ label: "Search", onClick: onSearchClick }] : []),
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              className={`px-4 py-3 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${
                btn.label === "Donate"
                  ? isDark
                    ? "bg-amber-900/20 border-amber-500/20 text-amber-500"
                    : "bg-amber-50 border-amber-200 text-amber-600"
                  : isDark
                  ? "bg-zinc-900/60 border-white/5 text-zinc-500"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div
          className={`border p-1.5 rounded-2xl flex items-center backdrop-blur-3xl w-full sm:min-w-[450px] relative ${
            isDark
              ? "bg-zinc-900/40 border-white/5"
              : "bg-white border-gray-200 shadow-xl"
          }`}
        >
          <input
            ref={inputRef}
            value={inputText}
            onFocus={onFocus}
            disabled={
              cooldown > 0 ||
              isPosting ||
              dailyPostCount >= MAX_POSTS_PER_DAY ||
              hourlyPostCount >= MAX_POSTS_PER_HOUR
            }
            onChange={handleTextChange}
            placeholder={
              dailyPostCount >= MAX_POSTS_PER_DAY
                ? "Daily limit reached..."
                : hourlyPostCount >= MAX_POSTS_PER_HOUR
                ? "Hourly limit reached..."
                : cooldown > 0
                ? "Cooldown active..."
                : "Share something unspoken..."
            }
            className={`flex-1 px-4 py-2 outline-none text-sm bg-transparent transition-colors ${
              isDark
                ? "text-white placeholder:text-zinc-600"
                : "text-zinc-900 placeholder:text-zinc-400"
            } ${
              cooldown > 0 ||
              dailyPostCount >= MAX_POSTS_PER_DAY ||
              hourlyPostCount >= MAX_POSTS_PER_HOUR
                ? "opacity-30"
                : "opacity-100"
            }`}
          />

          {inputText && (
            <div
              className={`absolute right-24 text-[9px] font-mono ${
                isNearLimit
                  ? "text-orange-500 font-bold"
                  : "text-zinc-500"
              }`}
            >
              {inputText.length}/{CHAR_LIMIT}
            </div>
          )}

          <button
            onClick={handlePost}
            disabled={!canPost()}
            className={`px-6 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
              cooldown > 0 ||
              dailyPostCount >= MAX_POSTS_PER_DAY ||
              hourlyPostCount >= MAX_POSTS_PER_HOUR
                ? "bg-zinc-800 text-zinc-600"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95"
            } disabled:opacity-20`}
          >
            {isPosting
              ? "..."
              : dailyPostCount >= MAX_POSTS_PER_DAY ||
                hourlyPostCount >= MAX_POSTS_PER_HOUR
              ? "LIMIT"
              : cooldown > 0
              ? `${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(
                  2,
                  "0"
                )}`
              : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}