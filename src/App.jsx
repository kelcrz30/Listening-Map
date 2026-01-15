import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { supabase } from "./supabaseClient";
import { getMemoryIcon, MAP_TILES } from "./MapConfig";

// Components
import Atmosphere from "./components/Atmosphere";
import Constellations from "./components/Constellations";
import MapController from "./components/MapController";
import ListeningButton from "./components/ListeningButton";

import "leaflet/dist/leaflet.css";

// --- Helper: Relative Time ---
const formatRelativeTime = (dateString) => {
  if (!dateString) return "";
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);
  if (diffInSeconds < 60) return "Just now";
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return past.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default function App() {
  const [secrets, setSecrets] = useState([]);
  const [inputText, setInputText] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showManifesto, setShowManifesto] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [targetPos, setTargetPos] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(2);
  const [isNodding, setIsNodding] = useState(false);

  const [visited, setVisited] = useState(() => {
    const saved = localStorage.getItem("visited_secrets");
    return saved ? JSON.parse(saved) : [];
  });

  // --- 1. CORE LOGIC: Fetch & Real-time ---
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unspoken_words' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSecrets((prev) => [payload.new, ...prev]);
            setNotification("A new heart has shared a secret...");
            setTimeout(() => setNotification(null), 4000);
          } 
          if (payload.eventType === 'UPDATE') {
            setSecrets((prev) => prev.map(s => {
              if (s.id === payload.new.id) {
                // Pulse Atmosphere on any nod
                if (payload.new.nods > (s.nods || 0)) {
                  triggerNodPulse();
                }
                // First Nod Notification for owner
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
        }
      ).subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const triggerNodPulse = () => {
    setIsNodding(true);
    if (navigator.vibrate) navigator.vibrate(50); 
    setTimeout(() => setIsNodding(false), 800);
  };

  const handlePost = async () => {
    if (!inputText.trim()) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { data } = await supabase
        .from('unspoken_words')
        .insert([{
          text: inputText,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          is_listening: false,
          nods: 0
        }])
        .select();

      if (data) {
        const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
        localStorage.setItem("my_secrets", JSON.stringify([...mySecrets, data[0].id]));
        setInputText("");
      }
    });
  };

  const handleNod = async (id, currentNods) => {
    await supabase.from('unspoken_words')
      .update({ nods: (currentNods || 0) + 1 })
      .eq('id', id);
  };

  const markAsVisited = (id) => {
    if (!visited.includes(id)) {
      const updatedVisited = [...visited, id];
      setVisited(updatedVisited);
      localStorage.setItem("visited_secrets", JSON.stringify(updatedVisited));
    }
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#09090b]">
      <Atmosphere isNodding={isNodding} />

      {/* --- OVERLAYS --- */}
      {showManifesto && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-3xl px-6">
          <div className="max-w-xl text-center">
            <h1 className="text-zinc-500 text-[10px] tracking-[0.8em] uppercase mb-12">A Map of Us</h1>
            <p className="text-2xl md:text-3xl font-serif italic text-white leading-relaxed mb-12">"This is a map of things we carry but never say."</p>
            <button onClick={() => setShowManifesto(false)} className="text-white/60 hover:text-white text-[10px] tracking-[0.4em] uppercase border border-white/10 px-10 py-5 rounded-full transition-all hover:bg-white/5">Enter the Silence</button>
          </div>
        </div>
      )}

      {showAboutModal && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowAboutModal(false)} />
          <div className="relative bg-zinc-900/90 border border-white/10 p-8 sm:p-12 rounded-[2.5rem] max-w-2xl w-full shadow-2xl">
            <h2 className="text-zinc-500 text-[10px] tracking-[0.5em] uppercase mb-8">The Philosophy</h2>
            <p className="text-xl sm:text-2xl font-serif italic text-white leading-relaxed mb-6">"I built this map to visualize the weight of the things we keep inside. Every dot is a breath, every nod is an echo." - Kel
              <br />
            </p>
            <button onClick={() => setShowAboutModal(false)} className="mt-8 text-zinc-500 hover:text-white text-[9px] uppercase tracking-widest">Close</button>
          </div>
        </div>
      )}

      {showContactModal && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowContactModal(false)} />
          <div className="relative bg-zinc-900/90 border border-white/10 p-8 sm:p-12 rounded-[2.5rem] max-w-lg w-full shadow-2xl text-center">
            <h2 className="text-zinc-500 text-[10px] tracking-[0.5em] uppercase mb-8">Suggestion Box</h2>
            <textarea value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder="How can we make this better?" className="w-full h-40 bg-transparent border border-white/5 rounded-2xl p-6 text-white text-sm font-light outline-none focus:border-orange-500/30 transition-all resize-none" />
            <button onClick={() => { setNotification("Note received."); setShowContactModal(false); setSuggestion(""); }} className="w-full mt-6 bg-white/5 hover:bg-white/10 text-white text-[9px] tracking-[0.4em] uppercase py-5 rounded-xl border border-white/10">Send into the Void</button>
          </div>
        </div>
      )}

      {/* --- NOTIFICATIONS & UI --- */}
      {notification && (
        <div className="fixed bottom-24 sm:bottom-32 left-4 sm:left-10 z-[2000] bg-zinc-900/80 backdrop-blur-md border border-orange-500/30 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full flex items-center gap-2 sm:gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-white/70 text-[8px] sm:text-[9px] tracking-widest uppercase">{notification}</span>
        </div>
      )}

      <div className="fixed top-6 sm:top-12 left-4 sm:left-12 z-[1000] pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span></div>
            <span className="text-white/30 text-[8px] sm:text-[9px] tracking-[0.4em] sm:tracking-[0.6em] uppercase">Presence</span>
          </div>
          <div className="mt-2 text-white flex items-baseline gap-2 sm:gap-4">
            <span className="text-2xl sm:text-4xl font-serif italic">{secrets.filter(s => s.is_listening).length}</span>
            <span className="text-zinc-600 text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] uppercase">Hearts Listening</span>
          </div>
        </div>
      </div>

      <button onClick={() => setShowSidebar(!showSidebar)} className="fixed top-6 sm:top-12 right-4 sm:right-12 z-[1001] bg-white/5 hover:bg-white/10 p-3 sm:p-4 rounded-full border border-white/10 backdrop-blur-md">
        <div className="w-4 h-4 sm:w-5 sm:h-5 flex flex-col justify-around items-end">
          <span className={`h-px bg-white transition-all ${showSidebar ? 'w-4 sm:w-5 rotate-45 translate-y-1.5 sm:translate-y-2' : 'w-4 sm:w-5'}`} />
          <span className={`h-px bg-white transition-all ${showSidebar ? 'opacity-0' : 'w-2.5 sm:w-3'}`} />
          <span className={`h-px bg-white transition-all ${showSidebar ? 'w-4 sm:w-5 -rotate-45 -translate-y-1.5 sm:-translate-y-2' : 'w-3 sm:w-4'}`} />
        </div>
      </button>

      {/* --- SIDEBAR --- */}
      <div className={`fixed top-0 right-0 h-full w-full sm:max-w-sm z-[1000] bg-zinc-950/90 backdrop-blur-3xl border-l border-white/5 transform transition-transform duration-1000 ${showSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 sm:p-12 pt-20 sm:pt-32 h-full overflow-y-auto custom-scrollbar">
          <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-10 sm:mb-16">The Collective Archive</h2>
          <div className="flex flex-col gap-10 sm:gap-14">
            {secrets.map((s) => (
              <div key={s.id} onClick={() => { setTargetPos([s.lat, s.lng]); setShowSidebar(false); markAsVisited(s.id); }} className="group cursor-pointer">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-zinc-700 text-[8px] tracking-[0.3em] uppercase">{visited.includes(s.id) ? "✓ Visited" : "New entry"}</p>
                  <p className="text-zinc-500 text-[8px] italic font-light">{formatRelativeTime(s.created_at)}</p>
                </div>
                <p className={`text-lg sm:text-xl font-serif italic leading-relaxed transition-all ${visited.includes(s.id) ? 'text-zinc-600' : 'text-zinc-400 group-hover:text-white'}`}>"{s.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- MAP --- */}
      <MapContainer center={[0, 0]} zoom={2} zoomControl={false} className="h-full w-full z-0">
        <TileLayer url={MAP_TILES} />
        <MapController secrets={secrets} targetPos={targetPos} setZoomLevel={setZoomLevel} />
        <Constellations secrets={secrets} zoomLevel={zoomLevel} />

        {secrets.map((s) => {
          const weight = Math.min((s.text?.length || 0) / 4 + (s.nods || 0) * 3, 40);
          return (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={getMemoryIcon(s.is_listening, visited.includes(s.id), weight)} eventHandlers={{ click: () => markAsVisited(s.id) }}>
              <Popup minWidth={280}>
                <div className="py-4 px-2 text-center text-white">
                  <span className="text-[8px] text-zinc-500 uppercase tracking-widest mb-4 block">drifted {formatRelativeTime(s.created_at)}</span>
                  <p className="text-xl font-serif italic leading-relaxed mb-8 px-4">"{s.text}"</p>
                  <div className="flex flex-col gap-4 items-center border-t border-white/5 pt-4">
                    <button onClick={() => {
                        const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
                        if (mySecrets.includes(s.id)) {
                          setNotification("You cannot echo your own silence.");
                          setTimeout(() => setNotification(null), 3000);
                          return;
                        }
                        handleNod(s.id, s.nods);
                      }} className="group flex flex-col items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${s.nods > 0 ? 'bg-orange-500 animate-pulse' : 'bg-zinc-600'}`} />
                      <span className="text-[9px] tracking-widest text-zinc-500 group-hover:text-orange-400 transition-colors uppercase">{s.nods || 0} Nods</span>
                    </button>
                    <ListeningButton id={s.id} isListening={s.is_listening} />
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* --- BOTTOM DOCK --- */}
      <div className="fixed bottom-4 sm:bottom-12 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-5xl px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-center">
          <button onClick={() => setShowAboutModal(true)} className="bg-zinc-900/60 hover:bg-zinc-800/80 backdrop-blur-md border border-white/5 text-zinc-500 hover:text-white text-[8px] sm:text-[9px] tracking-[0.3em] uppercase px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all">About</button>
          <button onClick={() => setShowContactModal(true)} className="bg-zinc-900/60 hover:bg-zinc-800/80 backdrop-blur-md border border-white/5 text-zinc-500 hover:text-white text-[8px] sm:text-[9px] tracking-[0.3em] uppercase px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all">Suggestions</button>
        </div>
        <div className="bg-zinc-900/40 border border-white/5 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl flex items-center shadow-2xl backdrop-blur-3xl w-full sm:min-w-[450px]">
          <input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Share something unspoken..." className="flex-1 px-3 sm:px-5 py-2.5 sm:py-3 outline-none text-xs sm:text-sm text-white bg-transparent placeholder:text-zinc-700 font-light" />
          <button onClick={handlePost} className="bg-white/5 hover:bg-white/10 text-white text-[8px] sm:text-[9px] font-bold px-4 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl uppercase tracking-[0.3em] sm:tracking-[0.4em] border border-white/10">Post</button>
        </div>
      </div>
    </div>
  );
}