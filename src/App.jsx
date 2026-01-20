import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Analytics } from "@vercel/analytics/react";
import { supabase } from "./supabaseClient";
import { MAP_TILES } from "./MapConfig";
import L from 'leaflet';
import { checkText } from "./utils/wordFilter";
import SecretHeaderCard from "./components/SecretHeaderCard";
import WorldLabel from "./components/WorldLabel";
import { generateFingerprint, checkRateLimit, logAction } from "./utils/antiSpam";
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
import MentalHealthModal from './components/MentalHealthModal';
import { checkForCrisisLanguage } from './utils/mentalHealthDetector';

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
  // --- DATABASE & REALTIME LOGIC ---
  useEffect(() => {
    const fetchSecrets = async () => {
      const { data } = await supabase
        .from('unspoken_words')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setSecrets(data);
    };
    
    fetchSecrets();

    const sessionUserId = `user-${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase.channel('global_presence', {
      config: { presence: { key: sessionUserId } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        setOnlineCount(Object.keys(newState).length); 
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'unspoken_words'
      }, (payload) => {
        // HANDLER: INSERT (The Triple-Post Fix)
        if (payload.eventType === 'INSERT') {
          setSecrets((prev) => {
            const alreadyExists = prev.some(s => s.id === payload.new.id);
            if (alreadyExists) return prev; 
            return [payload.new, ...prev];
          });
          setNotification("A new heart has shared a secret...");
          setTimeout(() => setNotification(null), 4000);
        }
        
        // HANDLER: UPDATE
        if (payload.eventType === 'UPDATE') {
          setSecrets((prev) => prev.map(s => {
            if (s.id === payload.new.id) {
              if (payload.new.nods > (s.nods || 0)) triggerNodPulse();
              return payload.new; 
            }
            return s;
          }));
        }

        // HANDLER: DELETE
        if (payload.eventType === 'DELETE') {
          setSecrets((prev) => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => supabase.removeChannel(channel);
  }, []);

  // --- ACTION HANDLERS ---

  const handleNewPostSuccess = (newPost) => {
    // We do NOT add to secrets here. The postgres_changes listener above handles it.
    setNotification("Your secret has been shared with the world.");
    setSelectedLocation(null);
    setIsPlacementMode(false);
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
    // Optimistic UI update
    setSecrets(prev => prev.map(s => s.id === id ? { ...s, nods: newCount } : s));

    const updatedNods = hasNodded ? noddedSecrets.filter(i => i !== id) : [...noddedSecrets, id];
    localStorage.setItem("nodded_secrets", JSON.stringify(updatedNods));
    await supabase.from('unspoken_words').update({ nods: newCount }).eq('id', id);
  };

const handleAddWhisper = async (id, whisperText) => {
  if (!whisperText.trim()) return;
  
 const crisisCheck = checkForCrisisLanguage(whisperText);
 console.log("Crisis Check Result:", crisisCheck);
  if (crisisCheck.isCrisis) {
    setShowMentalHealthModal(true);
  }
  // 1. Minimum length check
  if (whisperText.trim().length < 2) {
    setNotification("Whisper must be at least 2 characters.");
    setTimeout(() => setNotification(null), 3000);
    return;
  }
  
  // 2. Profanity check
  const result = checkText(whisperText);
  if (result.isProfane) {
    setNotification(`Found ${result.count} forbidden word(s).`);
    setTimeout(() => setNotification(null), 4000);
    return;
  }

  // 3. Rate limit check - CRITICAL FOR SPAM PREVENTION
  const fingerprint = await generateFingerprint();
  const rateCheck = await checkRateLimit(supabase, fingerprint, 'whisper');
  if (!rateCheck.allowed) {
    setNotification(`Too many whispers. ${rateCheck.reason}`);
    setTimeout(() => setNotification(null), 4000);
    return;
  }

  // 4. Check for duplicate whispers (last 2 minutes)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: currentSecret } = await supabase
    .from('unspoken_words')
    .select('replies')
    .eq('id', id)
    .single();
  
  const recentDuplicate = currentSecret?.replies?.some(reply => 
    reply.text === whisperText.trim() && 
    new Date(reply.created_at) > new Date(twoMinutesAgo)
  );
  
  if (recentDuplicate) {
    setNotification("You just sent this whisper. Please wait before sending again.");
    setTimeout(() => setNotification(null), 3000);
    return;
  }

  // 5. Add the whisper
  const newReply = { text: whisperText.trim(), created_at: new Date().toISOString() };
  const updatedReplies = [...(currentSecret?.replies || []), newReply];

  const { error } = await supabase
    .from('unspoken_words')
    .update({ replies: updatedReplies })
    .eq('id', id);

  if (!error) {
    // 6. Log the action - IMPORTANT FOR TRACKING
    await logAction(supabase, fingerprint, 'whisper', navigator.userAgent);
    
    // 7. Update localStorage
    const commented = JSON.parse(localStorage.getItem("commented_secrets") || "[]");
    if (!commented.includes(id)) {
      localStorage.setItem("commented_secrets", JSON.stringify([...commented, id]));
    }
    
    // 8. Update UI
    setSecrets(prev => prev.map(s => s.id === id ? { ...s, replies: updatedReplies } : s));
    setNotification("Whisper sent.");
  } else {
    setNotification("Failed to send whisper. Try again.");
  }
  
  setTimeout(() => setNotification(null), 3000);
};

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
    
    const { error } = await supabase.from('unspoken_words').delete().eq('id', deleteTargetId);

    if (!error) {
      setSecrets(prev => prev.filter(s => s.id !== deleteTargetId));
      localStorage.setItem("my_secrets", JSON.stringify(mySecrets.filter(id => id !== deleteTargetId)));
      setNotification("Secret deleted.");
    }
    setDeleteTargetId(null);
    setTimeout(() => setNotification(null), 3000);
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

      {/* NAVIGATION CONTROLS */}
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

      {/* THE MAP */}
      <MapContainer 
        center={[13, 122]} 
        zoom={4} 
        minZoom={3} 
        zoomControl={false} 
        className="h-full w-full z-0"
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
          activeSecretId={activeSecretId}
          setActiveSecretId={setActiveSecretId}
          onMarkAsVisited={markAsVisited} 
          onNod={handleNod}
          onWhisper={handleAddWhisper}
          onDelete={(id) => setDeleteTargetId(id)} 
          setNotification={setNotification}
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
      {/* ... all your existing components ... */}
      
      <MentalHealthModal 
        isOpen={showMentalHealthModal}
        onClose={() => setShowMentalHealthModal(false)}
        isDark={isDark}
      />

    </div>
  );
}