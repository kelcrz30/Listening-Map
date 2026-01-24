import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Analytics } from "@vercel/analytics/react";
import { supabase } from "./supabaseClient";
import { MAP_TILES } from "./MapConfig";
import L from 'leaflet';
import { checkText } from "./utils/wordFilter";
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
import MentalHealthModal from './components/MentalHealthModal';
import { checkForCrisisLanguage } from './utils/mentalHealthDetector';
import { generateFingerprint, checkRateLimitClientSide, logAction } from "./utils/antiSpam";

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
  // --- DATABASE & REALTIME LOGIC ---
  useEffect(() => {
    
    const fetchSecrets = async () => {
      const { data, error } = await supabase
        .from('unspoken_words')
        .select('*')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) {
        console.error('❌ [FETCH] Error:', error);
      } else {

        setSecrets(data || []);
      }
    };
      
    fetchSecrets();

    const sessionUserId = `user-${Math.random().toString(36).substr(2, 9)}`;
    
    const channel = supabase.channel('global_presence', {
      config: { 
        presence: { key: sessionUserId }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const count = Object.keys(channel.presenceState()).length;
        setOnlineCount(count); 
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'unspoken_words'
      }, (payload) => {
        
        // --- HANDLE NEW POSTS ---
        if (payload.eventType === 'INSERT') {
          const completePost = {
            ...payload.new,
            nods: payload.new.nods ?? 0,
            replies: Array.isArray(payload.new.replies) ? payload.new.replies : [],
            created_at: payload.new.created_at || new Date().toISOString()
          };

          // Validate required fields
          if (!completePost.text || completePost.lat === undefined || completePost.lng === undefined) {
            console.error('❌ [INSERT] Missing fields:', completePost);
            return;
          }

          if (completePost.is_visible !== false) {
            setSecrets((prev) => {
              if (prev.some(s => s.id === completePost.id)) {
                return prev;
              }
              return [completePost, ...prev];
            });
            
            setNotification("A new heart has shared a secret...");
            setTimeout(() => setNotification(null), 4000);
          }
        }
        
        // --- HANDLE UPDATES (replies, nods, is_listening) ---
        if (payload.eventType === 'UPDATE') {
          
          setSecrets((prev) => {
            return prev.map(s => {
              if (s.id !== payload.new.id) return s;
              
              // Merge old data with new, ensuring we keep all fields
              return {
                ...s,
                ...payload.new,
                nods: payload.new.nods ?? s.nods ?? 0,
                replies: Array.isArray(payload.new.replies) ? payload.new.replies : (s.replies || []),
                is_listening: payload.new.is_listening ?? s.is_listening ?? false
              };
            }).filter(s => s.is_visible !== false);
          });
          
          // Check if this is our post and notify
          const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
          if (mySecrets.includes(payload.new.id)) {
            setNotification("Someone whispered back to your secret...");
            setTimeout(() => setNotification(null), 4000);
          }
        }

        // --- HANDLE DELETIONS ---
        if (payload.eventType === 'DELETE') {
          setSecrets((prev) => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe(async (status) => {
        
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- ACTION HANDLERS ---
  const handleNewPostSuccess = (newPost) => {
    
    setSecrets((prev) => {
      if (prev.some(s => s.id === newPost.id)) {
        return prev;
      }
      return [newPost, ...prev];
    });

    setTargetPos([newPost.lat, newPost.lng]);
    setNotification("Your secret has been shared with the world.");
    setSelectedLocation(null);
    setIsPlacementMode(false);

    const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
    if (!mySecrets.includes(newPost.id)) {
      localStorage.setItem("my_secrets", JSON.stringify([...mySecrets, newPost.id]));
    }

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
    setNotification(`📍 ${displayName.split(',')[0]} selected!`);
    setTimeout(() => setNotification(null), 3000);
  };

const handleNod = async (id) => {
  const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
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
    // --- SECURE CHANGE START ---
    // We call the Edge Function judge instead of trying to write to the DB directly
    const { data, error } = await supabase.functions.invoke('echo-pulse', {
      body: { postId: id }
    });

    if (error) throw error;
    // --- SECURE CHANGE END ---

    // Update local state and storage
    localStorage.setItem("nodded_secrets", JSON.stringify([...noddedSecrets, id]));
    
    // Trigger the haptic/visual pulse
    triggerNodPulse();
    
    // Note: You don't strictly need setSecrets here anymore because your 
    // Realtime listener in useEffect will see the DB change and update the UI for you!
  } catch (err) {
    console.error("❌ Echo failed:", err);
    setNotification("The echo faded into the void.");
    setTimeout(() => setNotification(null), 3000);
  }
};
const handleAddWhisper = async (id, whisperText, turnstileToken) => {
  if (!whisperText.trim() || !turnstileToken) {
    setNotification("Security check required.");
    return;
  }

  try {
    // Generate the browser fingerprint to check ban status
    const fingerprint = await generateFingerprint();

    const { data, error } = await supabase.functions.invoke('whisper-secure', {
      body: { 
        postId: id, 
        whisperText: whisperText.trim(),
        turnstileToken: turnstileToken,
        fingerprint: fingerprint // <--- CRITICAL: Tells the server who you are
      }
    });

    if (error) {
      const errorBody = await error.context.json();
      throw new Error(errorBody.error || "Security block");
    }

    const commented = JSON.parse(localStorage.getItem("commented_secrets") || "[]");
    if (!commented.includes(id)) {
      localStorage.setItem("commented_secrets", JSON.stringify([...commented, id]));
    }

    setNotification(data.status === 'filtered' ? "Whisper sent." : "Whisper sent securely.");
    setTimeout(() => setNotification(null), 3000);
    
  } catch (err) {
    setNotification(err.message);
    setTimeout(() => setNotification(null), 4000);
  }
};


const confirmDelete = async (pin) => {
  if (!deleteTargetId) return;
  setIsDeleting(true); 
  
  try {
    // This calls your 'rapid-responder' Edge Function securely
    const { data, error } = await supabase.functions.invoke('rapid-responder', { 
      body: { postId: deleteTargetId, pin: pin } 
    });

    if (error) {
      // If the PIN is wrong or post is permanent, the Edge Function returns an error
      const errorBody = await error.context.json();
      setNotification(errorBody.error || "The silence remains.");
    } else if (data?.success) {
      // If successful, remove it from the map immediately
      setSecrets(prev => prev.filter(s => s.id !== deleteTargetId));
      setDeleteTargetId(null);
      setNotification("Secret released into the wind.");
    }
  } catch (err) {
    console.error("❌ Delete failed:", err);
    setNotification("Connection lost. Try again later.");
  } finally {
    setIsDeleting(false);
    setTimeout(() => setNotification(null), 5000);
  }
};
  const handleToggleListening = async (secretId, isNowListening) => {
    try {
      const { error } = await supabase
        .from('unspoken_words')
        .update({ is_listening: isNowListening })
        .eq('id', secretId);

      if (error) throw error;

      setSecrets(prev => prev.map(s => 
        s.id === secretId ? { ...s, is_listening: isNowListening } : s
      ));
    } catch (err) {
      console.error("❌ Toggle listening failed:", err);
    }
  };

  return (
    <div className={`h-screen w-screen relative overflow-hidden ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      <Atmosphere isNodding={isNodding} isDark={isDark} />

      <MapSearch 
        isDark={isDark}
        isVisible={!useCurrentLocation}
        onLocationFound={handleSearchLocationFound}
      />

      {showManifesto && <ManifestoOverlay onClose={() => setShowManifesto(false)} />}
      {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
      {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} setNotification={setNotification} />}
      {showDonationModal && <DonationModal isOpen={showDonationModal} onClose={() => setShowDonationModal(false)} isDark={isDark} />}
      
      {deleteTargetId && (
        <DeleteConfirmationModal
          isOpen={!!deleteTargetId}
          onClose={() => setDeleteTargetId(null)}
          onConfirm={confirmDelete}
          isDark={isDark}
        />
      )}

      <Notification message={notification} isDark={isDark} />
      <PresenceCounter count={onlineCount} isDark={isDark} />

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
        style={{ height: "100%", width: "100%", background: 'transparent' }}
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
              className: 'preview-marker',
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
      
      <MentalHealthModal 
        isOpen={showMentalHealthModal}
        onClose={() => setShowMentalHealthModal(false)}
        isDark={isDark}
      />
    </div>
  );
}