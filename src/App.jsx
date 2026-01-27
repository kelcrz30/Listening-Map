import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Analytics } from "@vercel/analytics/react";
import { MAP_TILES } from "./MapConfig";
import L from "leaflet";
import WorldLabel from "./components/WorldLabel";
import Atmosphere from "./components/Atmosphere";
import Constellations from "./components/Constellations";
import MapController from "./components/MapController";
import MapClickHandler from "./components/MapClickHandler";

import MapSearch from "./components/MapSearch";
import ManifestoOverlay from "./components/ManifestoOverlay";
import AboutModal from "./components/AboutModal";
import ContactModal from "./components/ContactModal";
import Notification from "./components/Notification";
import PresenceCounter from "./components/PresenceCounter";
import MenuButton from "./components/MenuButton";
import ThemeToggle from "./components/ThemeToggle";
import Sidebar from "./components/Sidebar";
import DeleteConfirmationModal from "./components/DeleteConfirmationModal";
import MapMarkers from "./components/MapMarkers";
import BottomDock from "./components/BottomDock";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import "leaflet/dist/leaflet.css";
import MapLegend from "./components/MapLegend";
import DonationModal from "./components/DonationModal";
import NotificationBell from "./components/NotificationBell";
import MentalHealthModal from "./components/MentalHealthModal";

import { supabase } from "./supabaseClient";
import { generateFingerprint } from "./utils/antiSpam";
import { getMySecrets, addMySecret } from "./utils/mySecrets";

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
      <Analytics />
    </ThemeProvider>
  );
}

function AppContent() {
  const { isDark } = useTheme();

  const [secrets, setSecrets] = useState([]);
  const [notification, setNotification] = useState(null);
  const [targetPos, setTargetPos] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(2);
  const [isNodding, setIsNodding] = useState(false);

  const [showManifesto, setShowManifesto] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const [visited, setVisited] = useLocalStorage("visited_secrets", []);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);

  const [showDonationModal, setShowDonationModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [activeSecretId, setActiveSecretId] = useState(null);

  const [onlineCount, setOnlineCount] = useState(1);
  const [showMentalHealthModal, setShowMentalHealthModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const readMySecrets = () => {
    try {
      return JSON.parse(localStorage.getItem("my_secrets") || "[]");
    } catch {
      return [];
    }
  };

  async function fetchWithAuth(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}
  const isPublicPost = (post) => post?.is_visible === true && post?.is_flagged !== true;

  const shouldShowPost = (post, mySecrets) => isPublicPost(post) || mySecrets.includes(post.id);

  // ✅ Fetch posts through API proxy
  const fetchSecrets = async () => {
    try {
      const response = await fetchWithAuth("/api/get-posts");
      const result = await response.json();

      if (result.error) {
        console.error("❌ [FETCH] Error:", result.error);
        return;
      }

      const mySecrets = readMySecrets();
      const visibleSecrets = (result.data || []).filter((post) => shouldShowPost(post, mySecrets));

      setSecrets(visibleSecrets);
    } catch (err) {
      console.error("Failed to fetch:", err);
    }
  };

  // ✅ Main startup effect: ensure anon session FIRST, then start realtime/polling
  useEffect(() => {
    let poll;
    let onlineInterval;
    let eventSource;

    (async () => {
      // 1) Ensure anonymous auth session exists
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("Anonymous sign-in failed:", error.message);
          // if sign-in fails, still allow app to run; your proxy routes might still work
        }
      }

      // 2) Presence session id (not Supabase session)
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // 3) Initial fetch + polling
      await fetchSecrets();
      poll = setInterval(fetchSecrets, 5000);

      // 4) SSE realtime updates
      eventSource = new EventSource("/api/realtime");

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const mySecrets = readMySecrets();

          if (payload.eventType === "INSERT") {
            const completePost = {
              ...payload.new,
              nods: payload.new.nods ?? 0,
              replies: Array.isArray(payload.new.replies) ? payload.new.replies : [],
              created_at: payload.new.created_at || new Date().toISOString(),
            };

            if (!completePost.text || completePost.lat === undefined || completePost.lng === undefined) {
              console.error("❌ [INSERT] Missing fields:", completePost);
              return;
            }

            if (!shouldShowPost(completePost, mySecrets)) return;

            setSecrets((prev) => {
              if (prev.some((s) => s.id === completePost.id)) return prev;
              return [completePost, ...prev];
            });

            if (isPublicPost(completePost)) {
              setNotification("A new heart has shared a secret...");
              setTimeout(() => setNotification(null), 4000);
            }
          }

          if (payload.eventType === "UPDATE") {
            const updated = payload.new;

            setSecrets((prev) => {
              const next = prev
                .map((s) => {
                  if (s.id !== updated.id) return s;

                  return {
                    ...s,
                    ...updated,
                    nods: updated.nods ?? s.nods ?? 0,
                    replies: Array.isArray(updated.replies) ? updated.replies : s.replies || [],
                    is_listening: updated.is_listening ?? s.is_listening ?? false,
                  };
                })
                .filter((s) => shouldShowPost(s, mySecrets));

              return next;
            });

            if (mySecrets.includes(updated.id)) {
              setNotification("Someone whispered back to your secret...");
              setTimeout(() => setNotification(null), 4000);
            }
          }

          if (payload.eventType === "DELETE") {
            setSecrets((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        } catch (err) {
          console.error("Realtime parse error:", err);
        }
      };

      eventSource.onerror = () => {
        console.error("❌ Realtime connection error");
        eventSource?.close();
      };

      // 5) Online count tracking
      const updateOnlineCount = async () => {
        try {
          const response = await fetch("/api/get-online-count", {
            headers: { "x-session-id": sessionId },
          });
          const { count } = await response.json();
          if (count) setOnlineCount(count);
        } catch (err) {
          console.error("Failed to get online count:", err);
        }
      };

      updateOnlineCount();
      onlineInterval = setInterval(updateOnlineCount, 30000);
    })();

    return () => {
      if (poll) clearInterval(poll);
      if (onlineInterval) clearInterval(onlineInterval);
      if (eventSource) eventSource.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewPostSuccess = (newPost) => {
    setSecrets((prev) => {
      if (prev.some((s) => s.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });

    setTargetPos([newPost.lat, newPost.lng]);
    setNotification("Your secret has been shared with the world.");
    setSelectedLocation(null);
    setIsPlacementMode(false);
    addMySecret(newPost.id);
    setTimeout(() => setNotification(null), 3000);
  };

  const triggerNodPulse = () => {
    setIsNodding(true);
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => setIsNodding(false), 800);
  };

  const markAsVisited = (id) => {
    if (!visited.includes(id)) {
      const updated = [...visited, id];
      setVisited(updated);
      localStorage.setItem("visited_secrets", JSON.stringify(updated));
    }
  };

  const handleLocationSelect = (lat, lng) => {
    setSelectedLocation({ lat, lng });
    setIsPlacementMode(false);
    setNotification("📍 Location selected!");
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLocationModeToggle = (useCurrent) => {
    setUseCurrentLocation(useCurrent);
    if (!useCurrent) {
      setIsPlacementMode(true);
      setNotification("Click anywhere on the map to choose your location.");
      setTimeout(() => setNotification(null), 4000);
    } else {
      setSelectedLocation(null);
      setIsPlacementMode(false);
    }
  };

  const handleSearchLocationFound = (lat, lng, displayName) => {
    setSelectedLocation({ lat, lng });
    setTargetPos([lat, lng]);
    setIsPlacementMode(false);
    setNotification(`📍 ${displayName.split(",")[0]} selected!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleNod = async (id) => {
    const mySecrets = getMySecrets();
    const noddedSecrets = JSON.parse(localStorage.getItem("nodded_secrets") || "[]");

    if (mySecrets.includes(id)) {
      setNotification("You cannot echo your own silence.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (noddedSecrets.includes(id)) {
      setNotification("You have already acknowledged this heart.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
const response = await fetchWithAuth("/api/echo-pulse", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ postId: id }),
});

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to echo");

      localStorage.setItem("nodded_secrets", JSON.stringify([...noddedSecrets, id]));
      triggerNodPulse();
    } catch (err) {
      console.error("❌ Echo failed:", err);
      setNotification("The echo faded into the void.");
      setTimeout(() => setNotification(null), 3000);
    }
  };

const handleAddWhisper = async (id, whisperText, turnstileToken) => {
    if (!whisperText.trim() || !turnstileToken) {
      setNotification("Security check required.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const fingerprint = await generateFingerprint();

const response = await fetchWithAuth("/api/whisper-secure", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    postId: id,
    whisperText: whisperText.trim(),
    turnstileToken,
    fingerprint,
  }),
});

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Could not send whisper.");
      }

      // ✅ OPTIMISTIC UPDATE: Update the UI immediately
      setSecrets((prev) => 
        prev.map((s) => {
          if (s.id !== id) return s;
          
          // Create the new whisper object to match your DB structure
          const newWhisperObj = {
            text: whisperText.trim(),
            created_at: new Date().toISOString(),
            is_visible: result.status !== "filtered" // Hide if shadow-banned
          };

          return {
            ...s,
            replies: [...(s.replies || []), newWhisperObj]
          };
        })
      );

      // Keep the refresh as a backup to sync with server IDs/timestamps
      await fetchSecrets(); 

      const commented = JSON.parse(localStorage.getItem("commented_secrets") || "[]");
      if (!commented.includes(id)) {
        localStorage.setItem("commented_secrets", JSON.stringify([...commented, id]));
      }

      setNotification(result.status === "filtered" ? "Whisper sent." : "Whisper sent securely.");
      
    } catch (err) {
      console.error("Whisper failed:", err);
      setNotification(err.message || "The whisper faded into the void.");
    } finally {
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const confirmDelete = async (pin) => {
    if (!deleteTargetId) return;
    setIsDeleting(true);

    try {
      const response = await fetch("/api/rapid-responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: deleteTargetId, pin }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The silence remains.");

      if (result.success) {
        setSecrets((prev) => prev.filter((s) => s.id !== deleteTargetId));
        setDeleteTargetId(null);
        setNotification("Secret released into the wind.");
      }
    } catch (err) {
      console.error("❌ Delete failed:", err);
      setNotification(err.message || "Connection lost. Try again later.");
    } finally {
      setIsDeleting(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleToggleListening = async (secretId, isNowListening) => {
    try {
      const response = await fetch("/api/toggle-listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretId, isListening: isNowListening }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setSecrets((prev) =>
        prev.map((s) => (s.id === secretId ? { ...s, is_listening: isNowListening } : s))
      );
    } catch (err) {
      console.error("❌ Toggle listening failed:", err);
    }
  };

  const handleToggleVisibility = async (secretId, nextVisible) => {
    const mySecrets = readMySecrets();

    // Optimistic UI
    setSecrets((prev) =>
      prev
        .map((s) => (s.id === secretId ? { ...s, is_visible: nextVisible } : s))
        .filter((s) => shouldShowPost(s, mySecrets))
    );

    try {
      const response = await fetch("/api/toggle-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretId, isVisible: nextVisible }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setNotification(nextVisible ? "Now public." : "Now hidden.");
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error("❌ Toggle visibility failed:", err);

      // Rollback
      setSecrets((prev) =>
        prev
          .map((s) => (s.id === secretId ? { ...s, is_visible: !nextVisible } : s))
          .filter((s) => shouldShowPost(s, mySecrets))
      );

      setNotification("Failed to update visibility. Reverted.");
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className={`h-screen w-screen relative overflow-hidden ${isDark ? "bg-black" : "bg-gray-50"}`}>
      <Atmosphere isNodding={isNodding} isDark={isDark} />

      <MapSearch isDark={isDark} isVisible={!useCurrentLocation} onLocationFound={handleSearchLocationFound} />

      {showManifesto && <ManifestoOverlay onClose={() => setShowManifesto(false)} />}
      {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
      {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} setNotification={setNotification} />}
      {showDonationModal && (
        <DonationModal isOpen={showDonationModal} onClose={() => setShowDonationModal(false)} isDark={isDark} />
      )}

      {deleteTargetId && (
        <DeleteConfirmationModal
          isOpen={!!deleteTargetId}
          onClose={() => setDeleteTargetId(null)}
          onConfirm={confirmDelete}
          isDark={isDark}
        />
      )}

      <Notification message={notification} isDark={isDark} />
      <PresenceCounter isDark={isDark} />

      <div className="fixed top-6 right-4 sm:right-12 flex items-center gap-3 z-[1001]">
        <NotificationBell
          isDark={isDark}
          secrets={secrets}
          onNotificationClick={(lat, lng, id) => {
            setTargetPos([lat, lng]);
            setActiveSecretId(id);
            markAsVisited(id);
          }}
        />
        <ThemeToggle />
        <MenuButton isOpen={showSidebar} onClick={() => setShowSidebar(!showSidebar)} isDark={isDark} />
      </div>

      <Sidebar
        isOpen={showSidebar}
        secrets={secrets}
        visited={visited}
        isDark={isDark}
        onSecretClick={(lat, lng, id) => {
          setTargetPos([lat, lng]);
          setActiveSecretId(id);
          setShowSidebar(false);
          markAsVisited(id);
        }}
      />

      <MapContainer
        center={[20, 0]}
        zoom={3}
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%", background: "transparent" }}
        zoomControl={false}
      >
        <TileLayer url={isDark ? MAP_TILES.dark : MAP_TILES.light} />
        <WorldLabel isDark={isDark} />
        <MapController secrets={secrets} targetPos={targetPos} setZoomLevel={setZoomLevel} />
        <MapClickHandler isPlacementMode={isPlacementMode} onLocationSelect={handleLocationSelect} />
        <Constellations secrets={secrets} zoomLevel={zoomLevel} />

        {selectedLocation && (
          <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={L.divIcon({
              className: "preview-marker",
              html: `<div class="marker-bounce" style="background: #f59e0b; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />
        )}

        <MapMarkers
          secrets={secrets}
          visited={visited}
          isDark={isDark}
          onMarkAsVisited={markAsVisited}
          onNod={handleNod}
          onWhisper={handleAddWhisper}
          onDelete={setDeleteTargetId}
          activeSecretId={activeSecretId}
          setActiveSecretId={setActiveSecretId}
          onToggleListening={handleToggleListening}
          onToggleVisibility={handleToggleVisibility}
        />
      </MapContainer>

      {!showManifesto && <MapLegend isDark={isDark} />}

      <BottomDock
        onAboutClick={() => setShowAboutModal(true)}
        onContactClick={() => setShowContactModal(true)}
        onDonateClick={() => setShowDonationModal(true)}
        onPostSuccess={handleNewPostSuccess}
        isDark={isDark}
        useCurrentLocation={useCurrentLocation}
        onLocationModeToggle={handleLocationModeToggle}
        selectedLocation={selectedLocation}
        onCrisisDetected={() => setShowMentalHealthModal(true)}
      />

      <MentalHealthModal isOpen={showMentalHealthModal} onClose={() => setShowMentalHealthModal(false)} isDark={isDark} />
    </div>
  );
}
