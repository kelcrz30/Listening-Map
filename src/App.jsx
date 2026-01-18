import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Analytics } from "@vercel/analytics/react";
import { supabase } from "./supabaseClient";
import { MAP_TILES } from "./MapConfig";
import L from 'leaflet';
import { checkText } from "./utils/wordFilter";

// Components
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
  // NEW: State for real-time presence
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    const fetchSecrets = async () => {
      const { data } = await supabase
        .from('unspoken_words')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setSecrets(data);
    };
    
    fetchSecrets();

    // GENERATE A UNIQUE ID FOR THIS SESSION
    const sessionUserId = `user-${Math.random().toString(36).substr(2, 9)}`;

    const channel = supabase.channel('global_presence', {
      config: { 
        presence: { 
          key: sessionUserId  // <--- This ensures every visitor is unique
        } 
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        // We count the total number of unique keys present
        const count = Object.keys(newState).length;
        setOnlineCount(count); 
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'unspoken_words'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSecrets((prev) => [payload.new, ...prev]);
          setNotification("A new heart has shared a secret...");
          setTimeout(() => setNotification(null), 4000);
        }
        
        if (payload.eventType === 'UPDATE') {
          setSecrets((prev) => prev.map(s => {
            if (s.id === payload.new.id) {
              if (payload.new.nods > (s.nods || 0)) triggerNodPulse();
              return payload.new;
            }
            return s;
          }));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track the unique session
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => supabase.removeChannel(channel);
  }, []);

  const triggerNodPulse = () => {
    setIsNodding(true);
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => setIsNodding(false), 800);
  };

const handlePost = async (inputText, captchaToken) => {
  if (!inputText.trim()) return;

if (!captchaToken) {
    setNotification("Waiting for security check... please try again in a second.");
    return;
  }

  const result = checkText(inputText);
  if (result.isProfane) {
    setNotification(`Silence must be kind. Found ${result.count} forbidden word(s).`);
    setTimeout(() => setNotification(null), 4000);
    return;
  }

  if (useCurrentLocation) {
    setNotification("Accessing GPS...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Gagamit na tayo ng postToEdgeFunction sa halip na postToDatabase
        await postToEdgeFunction(inputText, pos.coords.latitude, pos.coords.longitude, captchaToken);
      },
      (geoError) => {
        alert("Location Error: Please allow location access to post.");
        setNotification("Location denied.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  } else {
    if (!selectedLocation) {
      setNotification("Please click on the map to choose a location.");
      setIsPlacementMode(true);
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    // Gagamit na tayo ng postToEdgeFunction
    await postToEdgeFunction(inputText, selectedLocation.lat, selectedLocation.lng, captchaToken);
    setSelectedLocation(null);
    setIsPlacementMode(false);
  }
};
const postToEdgeFunction = async (text, lat, lng, token) => {
  setNotification("Verifying and sharing...");
  
  try {
    // Call the Supabase Edge Function ('post-word')
    const { data, error } = await supabase.functions.invoke('post-word', {
      body: { 
        word: text, 
        lat: lat, 
        lng: lng, 
        captchaToken: token 
      },
    });

    if (error) {
      console.error("Post Error:", error);
      setNotification("Post failed: Verification error.");
      return;
    }

    console.log("Edge Function Response:", data); // DEBUG: See what we got back

    // CRITICAL: Save the secret ID so delete button appears
    if (data && data.id) {
      const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
      localStorage.setItem("my_secrets", JSON.stringify([...mySecrets, data.id]));
      setNotification("Message sent.");
    } else {
      console.error("Edge Function didn't return secret ID. Full response:", data);
      setNotification("Posted but couldn't track ownership.");
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    setNotification("Post failed unexpectedly.");
  }
};
  const markAsVisited = (id) => {
    if (!visited.includes(id)) {
      const updated = [...visited, id];
      setVisited(updated);
      localStorage.setItem("visited_secrets", JSON.stringify(updated));
    }
  };

  const postToDatabase = async (text, lat, lng) => {
    setNotification("Sharing to the map...");
    const { data, error } = await supabase
      .from('unspoken_words')
      .insert([{
        text: text,
        lat: lat,
        lng: lng,
        is_listening: false
      }])
      .select();

    if (error) {
      alert("Database Error: " + error.message);
      setNotification("Post failed.");
      return;
    }

    if (data && data.length > 0) {
      const newId = data[0].id;
      const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
      localStorage.setItem("my_secrets", JSON.stringify([...mySecrets, newId]));
      setNotification("Message sent.");
    }
  };

  const handleLocationSelect = (lat, lng) => {
    setSelectedLocation({ lat, lng });
    setIsPlacementMode(false);
    setNotification("📍 Location selected! Now write your message and post.");
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLocationModeToggle = (useCurrent) => {
    setUseCurrentLocation(useCurrent);
    if (!useCurrent) {
      setIsPlacementMode(true);
      setNotification("Click anywhere on the map to choose your location, or search for a place.");
      setTimeout(() => setNotification(null), 5000);
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
    setTimeout(() => setNotification(null), 4000);
  };

  const handleNod = async (id, currentNods) => {
    const noddedSecrets = JSON.parse(localStorage.getItem("nodded_secrets") || "[]");
    const hasNodded = noddedSecrets.includes(id);
    const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");

    if (mySecrets.includes(id)) {
      setNotification("You cannot echo your own silence.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const newCount = hasNodded ? Math.max(0, currentNods - 1) : currentNods + 1;
    setSecrets(prev => prev.map(s => s.id === id ? { ...s, nods: newCount } : s));

    const updatedNods = hasNodded ? noddedSecrets.filter(i => i !== id) : [...noddedSecrets, id];
    localStorage.setItem("nodded_secrets", JSON.stringify(updatedNods));
    await supabase.from('unspoken_words').update({ nods: newCount }).eq('id', id);
  };
const handleAddWhisper = async (id, whisperText) => {
  if (!whisperText.trim()) return;

  const result = checkText(whisperText);
  if (result.isProfane) {
    setNotification(`Whispers must be gentle. Found ${result.count} forbidden word(s).`);
    setTimeout(() => setNotification(null), 4000);
    return;
  }

  // 1. Kunin ang latest replies galing sa DB bago mag-update
  const { data: currentSecret, error: fetchError } = await supabase
    .from('unspoken_words')
    .select('replies')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error("Fetch Error:", fetchError);
    setNotification("Could not find the secret...");
    return;
  }

  // 2. I-prepare ang bagong array
  const newReply = { 
    text: whisperText, 
    created_at: new Date().toISOString() 
  };
  
  const updatedReplies = [...(currentSecret?.replies || []), newReply];

  // 3. I-update ang Database
  const { error: updateError } = await supabase
    .from('unspoken_words')
    .update({ replies: updatedReplies }) 
    .eq('id', id);

  if (updateError) {
    // KUNG MAG-ERROR DITO, POSIBLENG RLS ISSUE
    console.error("Supabase Update Error:", updateError);
    setNotification("The whisper was lost in the wind (Database Error).");
    setTimeout(() => setNotification(null), 3000);
    return;
  }

  // 4. Update local state ONLY if the DB update was successful
  setSecrets(prev => prev.map(s => 
    s.id === id ? { ...s, replies: updatedReplies } : s
  ));
  
  setNotification("Whisper sent.");
  setTimeout(() => setNotification(null), 3000);
};

  const handleDonateClick = () => {
    setShowDonationModal(true);
  };

  const handleDeleteSecret = (id) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    
    const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
    
    if (!mySecrets.includes(deleteTargetId)) {
      setNotification("You can only delete your own secrets.");
      setTimeout(() => setNotification(null), 3000);
      setDeleteTargetId(null);
      return;
    }

    const { error } = await supabase
      .from('unspoken_words')
      .delete()
      .eq('id', deleteTargetId);

    if (!error) {
      setSecrets(prev => prev.filter(s => s.id !== deleteTargetId));
      const updatedSecrets = mySecrets.filter(secretId => secretId !== deleteTargetId);
      localStorage.setItem("my_secrets", JSON.stringify(updatedSecrets));
      setNotification("Secret deleted.");
    } else {
      setNotification("Failed to delete.");
    }
    
    setTimeout(() => setNotification(null), 3000);
    setDeleteTargetId(null);
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
      {showDonationModal && (
        <DonationModal 
          isOpen={showDonationModal}
          onClose={() => setShowDonationModal(false)} 
          isDark={isDark}
        />
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
      
      {/* Updated: Uses live onlineCount */}
      <PresenceCounter count={onlineCount} isDark={isDark} />
      

{/* Floating UI Controls - TOP RIGHT */}
<div className="fixed top-6 right-4 sm:right-12 flex items-center gap-3 z-[1001] pointer-events-auto">
  <NotificationBell 
    isDark={isDark}
    secrets={secrets}
    onNotificationClick={(lat, lng, id) => {
      setTargetPos([lat, lng]);
      markAsVisited(id);
    }}
  />
  <ThemeToggle />
  <MenuButton 
    isOpen={showSidebar} 
    onClick={() => setShowSidebar(!showSidebar)} 
    isDark={isDark} 
  />
</div>

{/* Sidebar also needs high Z-index */}
<Sidebar
  isOpen={showSidebar}
  secrets={secrets}
  visited={visited}
  isDark={isDark}
  onSecretClick={(lat, lng, id) => {
    setTargetPos([lat, lng]);
    setShowSidebar(false);
    markAsVisited(id);
  }}
/>
      <MapContainer 
        center={[13, 122]} 
        zoom={4}              
        minZoom={3}           
        worldCopyJump={true}  
        noWrap={false}        
        zoomControl={false} 
        className="h-full w-full z-0"
      >
        <TileLayer url={isDark ? MAP_TILES.dark : MAP_TILES.light} />
        <MapController secrets={secrets} targetPos={targetPos} setZoomLevel={setZoomLevel} />
        <MapClickHandler 
          isPlacementMode={isPlacementMode} 
          onLocationSelect={handleLocationSelect}
        />
        <Constellations secrets={secrets} zoomLevel={zoomLevel} />
        
        {selectedLocation && (
          <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={L.divIcon({
              className: 'preview-marker',
              html: `<div style="
                background: linear-gradient(135deg, #f59e0b, #fb923c);
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 20px rgba(245, 158, 11, 0.6), 0 4px 12px rgba(0,0,0,0.3);
                animation: bounce 1s ease-in-out infinite;
              "></div>
              <style>
                @keyframes bounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-10px); }
                }
              </style>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
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
          onDelete={handleDeleteSecret} 
          setNotification={setNotification}
        />
      </MapContainer>
      
      {!showManifesto && <MapLegend isDark={isDark} />}


      
      <BottomDock
        onAboutClick={() => setShowAboutModal(true)}
        onContactClick={() => setShowContactModal(true)}
        onDonateClick={handleDonateClick}
        onPost={(text, token) => handlePost(text, token)}
        isDark={isDark}
        useCurrentLocation={useCurrentLocation}
        onLocationModeToggle={handleLocationModeToggle}
        selectedLocation={selectedLocation}
      />
      <Analytics />
    </div>
  );
}