import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { supabase } from "./supabaseClient";
import { MAP_TILES } from "./MapConfig";
import L from 'leaflet';

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
import MapMarkers from "./components/MapMarkers";
import BottomDock from "./components/BottomDock";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import "leaflet/dist/leaflet.css";

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
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

  useEffect(() => {
    const fetchSecrets = async () => {
      const { data } = await supabase
        .from('unspoken_words')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setSecrets(data);
    };
    
    fetchSecrets();

    const channel = supabase
      .channel('global_presence')
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
              if (payload.new.nods > (s.nods || 0)) {
                triggerNodPulse();
              }
              
              const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
              if (mySecrets.includes(s.id) && (s.nods === 0 || !s.nods) && payload.new.nods === 1) {
                setNotification("Someone out there felt your words...");
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                setTimeout(() => setNotification(null), 6000);
              }
              return payload.new;
            }
            return s;
          }));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const triggerNodPulse = () => {
    setIsNodding(true);
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => setIsNodding(false), 800);
  };

  const handlePost = async (inputText) => {
    if (!inputText.trim()) return;
    
    if (useCurrentLocation) {

      setNotification("Accessing GPS...");
      
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await postToDatabase(inputText, pos.coords.latitude, pos.coords.longitude);
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
      
      await postToDatabase(inputText, selectedLocation.lat, selectedLocation.lng);
      setSelectedLocation(null);
      setIsPlacementMode(false);
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

  // Update UI immediately
  setSecrets(prev => prev.map(s => s.id === id ? { ...s, nods: newCount } : s));

  // Update LocalStorage
  const updatedNods = hasNodded ? noddedSecrets.filter(i => i !== id) : [...noddedSecrets, id];
  localStorage.setItem("nodded_secrets", JSON.stringify(updatedNods));

  // Update Database
  await supabase.from('unspoken_words').update({ nods: newCount }).eq('id', id);
};

  const handleAddWhisper = async (id, whisperText) => {
    const { error } = await supabase
      .from('unspoken_words')
      .update({ whispers: whisperText })
      .eq('id', id);

    if (error) {
      setNotification("The whisper was lost in the wind.");
    } else {
      setNotification("Whisper sent.");
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

      <Notification message={notification} isDark={isDark} />
      <PresenceCounter count={secrets.filter(s => s.is_listening).length} isDark={isDark} />
      <ThemeToggle />
      <MenuButton isOpen={showSidebar} onClick={() => setShowSidebar(!showSidebar)} isDark={isDark} />

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
  /* --- THE NO-EDGE FIX --- */
  minZoom={3}           // 1. Prevents zooming out to see the top/bottom edges
  worldCopyJump={true}  // 2. Markers stay in the right place during infinite scrolling
  noWrap={false}        // 3. Allows horizontal scrolling without a "wall"
  /* ----------------------- */
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
  isDark={true} 
  onMarkAsVisited={markAsVisited} 
  onNod={handleNod}
  onWhisper={handleAddWhisper}
  setNotification={setNotification}
/>
      </MapContainer>

      {/* Bottom Dock */}
      <BottomDock
        onAboutClick={() => setShowAboutModal(true)}
        onContactClick={() => setShowContactModal(true)}
        onPost={handlePost}
        isDark={isDark}
        useCurrentLocation={useCurrentLocation}
        onLocationModeToggle={handleLocationModeToggle}
        selectedLocation={selectedLocation}
      />
    </div>
  );
}