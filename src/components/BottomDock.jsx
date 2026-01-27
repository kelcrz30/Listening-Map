import React, { useEffect, useMemo, useRef, useState } from "react";

function getOrCreateStableId(key = "uw_fingerprint") {
  let id = localStorage.getItem(key);
  if (!id) {
    id =
      (crypto?.randomUUID?.() ||
        `fp_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(key, id);
  }
  return id;
}

export default function BottomDock({
  onAboutClick,
  onContactClick,
  onDonateClick,
  onSearchClick, // ✅ optional: show Search button if you pass this prop
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

  // Human signals (collect only — DO NOT block on client)
  const [firstKeystroke, setFirstKeystroke] = useState(null);
  const [keystrokeTimestamps, setKeystrokeTimestamps] = useState([]);
  const [hasPointerMoved, setHasPointerMoved] = useState(false);
  const [interactionScore, setInteractionScore] = useState(0);

  // Local UX counters (backend must enforce real limits)
  const [dailyPostCount, setDailyPostCount] = useState(0);
  const [hourlyPostCount, setHourlyPostCount] = useState(0);

  const inputRef = useRef(null);

  // Turnstile refs
  const turnstileDivRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const turnstileReadyRef = useRef(false);

  const CHAR_LIMIT = 500;
  const MIN_TEXT_LENGTH = 2;
const IS_DEV =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";

const MIN_INTERVAL_MINUTES = IS_DEV ? 0 : 2;

const EDGE_FUNCTION_URL = "/api/create-post";


  const MAX_POSTS_PER_DAY = 30;
  const MAX_POSTS_PER_HOUR = 25;

  const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const fingerprint = useMemo(() => getOrCreateStableId(), []);

  const isNearLimit = inputText.length > 450;
  const isNearDailyLimit = dailyPostCount >= MAX_POSTS_PER_DAY * 0.8;
  const isNearHourlyLimit = hourlyPostCount >= MAX_POSTS_PER_HOUR * 0.75;

  // ----------------------------
  // Load Turnstile script once
  // ----------------------------
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
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = onLoad;
      document.head.appendChild(script);
    } else {
      if (window.turnstile) onLoad();
      else script.addEventListener("load", onLoad, { once: true });
    }

    return () => {
      try {
        script?.removeEventListener?.("load", onLoad);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TURNSTILE_SITE_KEY]);

  const resetTurnstile = () => {
    try {
      if (window.turnstile && turnstileWidgetIdRef.current != null) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
    } catch {}
  };

  const removeTurnstile = () => {
    try {
      if (window.turnstile && turnstileWidgetIdRef.current != null) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
      }
    } catch {}
    turnstileWidgetIdRef.current = null;
  };

  const renderTurnstile = () => {
    if (!TURNSTILE_SITE_KEY) return;
    if (!turnstileReadyRef.current || !window.turnstile) return;
    if (!turnstileDivRef.current) return;

    const shouldShow = inputText.trim().length > 0 && cooldown === 0;

    if (!shouldShow) {
      removeTurnstile();
      setCaptchaToken(null);
      return;
    }

    // avoid multiple renders (prevents "already loaded / imported multiple times")
    if (turnstileWidgetIdRef.current != null) return;

    setCaptchaToken(null);

    turnstileWidgetIdRef.current = window.turnstile.render(
      turnstileDivRef.current,
      {
        sitekey: TURNSTILE_SITE_KEY,
        theme: isDark ? "dark" : "light",
        // For non-interactive widget types, Cloudflare still often needs "managed"
        // But your dashboard is "Non-interactive", keep this:
        size: "normal",
        callback: (token) => setCaptchaToken(token || null),
        "expired-callback": () => setCaptchaToken(null),
        "error-callback": () => setCaptchaToken(null),
      }
    );
  };

  useEffect(() => {
    renderTurnstile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, cooldown, isDark]);

  // ----------------------------
  // Human-signal collection (no blocking)
  // ----------------------------
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

  // ----------------------------
  // Local counters + cooldown
  // ----------------------------
  useEffect(() => {
    const loadCounts = () => {
      const dailyData = localStorage.getItem("daily_posts");
      const hourlyData = localStorage.getItem("hourly_posts");
      const today = new Date().toISOString().split("T")[0];

      if (dailyData) {
        const parsed = JSON.parse(dailyData);
        if (parsed?.date === today) setDailyPostCount(parsed?.count || 0);
        else {
          localStorage.setItem(
            "daily_posts",
            JSON.stringify({ count: 0, date: today })
          );
          setDailyPostCount(0);
        }
      } else {
        localStorage.setItem(
          "daily_posts",
          JSON.stringify({ count: 0, date: today })
        );
        setDailyPostCount(0);
      }

      if (hourlyData) {
        const parsed = JSON.parse(hourlyData);
        if (parsed?.timestamp > Date.now() - 3600000)
          setHourlyPostCount(parsed?.count || 0);
        else {
          localStorage.removeItem("hourly_posts");
          setHourlyPostCount(0);
        }
      }
    };

    loadCounts();
    const interval = setInterval(loadCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("post_cooldown");
    if (saved) {
      const remaining = Math.max(
        0,
        Math.floor((parseInt(saved, 10) - Date.now()) / 1000)
      );
      setCooldown(remaining);
    }
  }, []);

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
    localStorage.setItem(
      "daily_posts",
      JSON.stringify({ count: newDaily, date: today })
    );
    setDailyPostCount(newDaily);

    const newHourly = hourlyPostCount + 1;
    localStorage.setItem(
      "hourly_posts",
      JSON.stringify({ count: newHourly, timestamp: Date.now() })
    );
    setHourlyPostCount(newHourly);
  };

  // ----------------------------
  // Typing metrics (send to backend)
  // ----------------------------
  const calculateTypingMetrics = () => {
    if (keystrokeTimestamps.length < 2) {
      return {
        avgSpeed: 0,
        variance: 0,
        totalTypingTime: firstKeystroke ? Date.now() - firstKeystroke : 0,
      };
    }

    const intervals = [];
    for (let i = 1; i < keystrokeTimestamps.length; i++) {
      intervals.push(keystrokeTimestamps[i] - keystrokeTimestamps[i - 1]);
    }
    const avgSpeed = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, x) => sum + (x - avgSpeed) ** 2, 0) /
      intervals.length;
    const totalTypingTime = firstKeystroke ? Date.now() - firstKeystroke : 0;

    return { avgSpeed, variance, totalTypingTime };
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

  const handlePost = async () => {
    if (!canPost()) return;

    // Honeypot: pretend success (no leak)
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
      let lat, lng;

      if (useCurrentLocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } else {
        if (!selectedLocation)
          throw new Error("Please select a location on the map first.");
        lat = selectedLocation.lat;
        lng = selectedLocation.lng;
      }

      const trimmedText = inputText.trim();
      const metrics = calculateTypingMetrics();
const FORCE_BOT_TEST = false; // turn to false after testing

const botMetrics = FORCE_BOT_TEST
  ? {
      typingSpeed: 10,         // super fast (<30)
      typingVariance: 0,       // robotic (<100)
      totalTypingTime: 500,    // too fast (<2000)
      keystrokeCount: 25,      // enough to trigger checks
      hasPointerMovement: false,
      interactionScore: 0,
    }
  : {
      typingSpeed: metrics.avgSpeed,
      typingVariance: metrics.variance,
      totalTypingTime: metrics.totalTypingTime,
      keystrokeCount: keystrokeTimestamps.length,
      hasPointerMovement: hasPointerMoved,
      interactionScore,
    };

      const resp = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
  text: trimmedText,
  lat: parseFloat(Number(lat).toFixed(6)),
  lng: parseFloat(Number(lng).toFixed(6)),
  post_pin: postPin?.length === 4 ? postPin : null,
  turnstileToken: captchaToken,
  fingerprint,
  timestamp: Date.now(),
  honeypot,
  requestId:
    crypto?.randomUUID?.() ||
    `req_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  behaviorMetrics: botMetrics, // ✅ this is the test payload
}),

      });

      const result = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        // Keep errors generic (don’t teach attacker)
if (resp.status === 429) {
  if (!IS_DEV) {
    const retrySecs = MIN_INTERVAL_MINUTES * 60;
    localStorage.setItem(
      "post_cooldown",
      String(Date.now() + retrySecs * 1000)
    );
    setCooldown(retrySecs);
  }
}
        throw new Error(result?.error || "Please try again later.");
      }

      // success (even if backend shadowbanned, it returns success)
      updatePostCounts();

if (!IS_DEV) {
  const successCooldown = MIN_INTERVAL_MINUTES * 60;
  localStorage.setItem(
    "post_cooldown",
    String(Date.now() + successCooldown * 1000)
  );
  setCooldown(successCooldown);
}

      // clear UI
      setInputText("");
      setPostPin("");
      setHoneypot("");
      setCaptchaToken(null);
      setFirstKeystroke(null);
      setKeystrokeTimestamps([]);
      setHasPointerMoved(false);
      setInteractionScore(0);

      // remove widget after post (prevents "hung widget" + "already loaded" spam)
      removeTurnstile();

      if (onPostSuccess) onPostSuccess(result.post);
    } catch (e) {
      setError(e?.message || "Please try again later.");
      setCaptchaToken(null);
      resetTurnstile();
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-5xl px-3 flex flex-col items-center gap-3">
      {/* Honeypot */}
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

      {/* Turnstile */}
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
