import React, { useState, useEffect, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { getMemoryIcon } from '../MapConfig';
import { formatRelativeTime } from '../utils/timeUtils';
import ListeningButton from './ListeningButton';

export default function MapMarkers({ secrets, visited, isDark, onMarkAsVisited, onNod, onWhisper, onDelete }) {
  const [whisperInput, setWhisperInput] = useState("");
  const [threadIndices, setThreadIndices] = useState({});
  const map = useMap();
  
  const scrollRef = useRef(null);
  const getActiveIndex = (markerId) => threadIndices[markerId] || 0;

  // Helper function to check if two coordinates are nearby (within ~50 meters)
  const areCoordinatesNearby = (lat1, lng1, lat2, lng2, thresholdKm = 0.05) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= thresholdKm;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [secrets]);

  return (
    <>
      {secrets.map((s) => {
        // Group secrets that are within 50 meters of each other
        const secretsAtLocation = secrets.filter(
          (other) => areCoordinatesNearby(s.lat, s.lng, other.lat, other.lng)
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const isLatestAtLocation = s.id === secretsAtLocation[0].id;
        if (!isLatestAtLocation) return null;

        const currentIndex = getActiveIndex(s.id);
        const currentSecret = secretsAtLocation[currentIndex];

        const weight = Math.min((currentSecret.text?.length || 0) / 4 + (currentSecret.nods || 0) * 3, 40);
        const echoedSecrets = JSON.parse(localStorage.getItem("nodded_secrets") || "[]");
        const hasEchoed = echoedSecrets.includes(currentSecret.id);
        const isVisited = visited.includes(currentSecret.id);
        
        // Check if this is the user's secret
        const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
        const isMySecret = mySecrets.includes(currentSecret.id);

        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={getMemoryIcon(currentSecret.is_listening, isVisited, weight, isDark)}
            eventHandlers={{ 
              click: () => {
                onMarkAsVisited(currentSecret.id);
                setThreadIndices(prev => ({ ...prev, [s.id]: 0 }));
              } 
            }}
          >
            <Popup maxWidth={window.innerWidth < 768 ? 260 : 350} onClose={() => setWhisperInput("")}>
              <div className={`relative py-4 px-1 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                
                {/* Close Button */}
                <button 
                  onClick={() => map.closePopup()}
                  className={`absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg text-xl transition-all z-50 ${
                    isDark 
                      ? 'hover:bg-white/10 text-white/40 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'
                  }`}
                >
                  ×
                </button>

                {/* Delete Button - Only show for user's secrets */}


                {/* NAVIGATION */}
                {secretsAtLocation.length > 1 && (
                  <div className={`grid grid-cols-3 items-center mb-4 pb-2 border-b px-2 ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <button 
                      disabled={currentIndex === secretsAtLocation.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        setThreadIndices(prev => ({ ...prev, [s.id]: currentIndex + 1 }));
                      }}
                      className="text-[9px] uppercase opacity-50 disabled:opacity-5"
                    > ← Older </button>
                    
                    <span className="text-[9px] font-mono opacity-40 uppercase">{currentIndex + 1} / {secretsAtLocation.length}</span>

                    <button 
                      disabled={currentIndex === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setThreadIndices(prev => ({ ...prev, [s.id]: currentIndex - 1 }));
                      }}
                      className="text-[9px] uppercase opacity-50 disabled:opacity-5"
                    > Newer → </button>
                  </div>
                )}

                <span className={`text-[8px] uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                  drifted {formatRelativeTime(currentSecret.created_at)}
                </span>
                
                {/* Main Text with Scrolling - FIXED OVERFLOW */}
                <div 
                  className={`max-h-[120px] overflow-y-auto overflow-x-hidden mb-6 px-4 custom-scrollbar touch-pan-y`}
                  onWheel={(e) => e.stopPropagation()}
                >
                  <p className={`text-lg font-serif italic leading-relaxed break-words break-all whitespace-pre-wrap ${isDark ? 'text-white' : 'text-black'}`}>
                    "{currentSecret.text}"
                  </p>
                </div>

                {/* WHISPER THREAD - FIXED OVERFLOW */}
                <div className="mb-4 px-2">
                  {(currentSecret.replies?.length > 0 || currentSecret.whispers) && (
                    <div 
                      ref={scrollRef}
                      className={`max-h-32 md:max-h-40 overflow-y-auto overflow-x-hidden mb-4 p-3 rounded-xl border text-left flex flex-col gap-3 pointer-events-auto custom-scrollbar touch-pan-y ${
                        isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'
                      }`}
                      onMouseEnter={() => { map.dragging.disable(); }}
                      onMouseLeave={() => { map.dragging.enable(); }}
                      onWheel={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <p className="text-[8px] uppercase tracking-widest opacity-40 top-0 bg-inherit z-10 py-1">Whisper Thread</p>
                      
                      {currentSecret.whispers && (
                        <div className="border-b border-white/5 pb-2">
                          <p className={`text-[11px] italic break-words break-all ${isDark ? 'text-orange-200/80' : 'text-orange-700'}`}>
                            "{currentSecret.whispers}"
                          </p>
                          <span className="text-[7px] uppercase opacity-30 mt-1 block">Original Whisper</span>
                        </div>
                      )}

                      {currentSecret.replies?.map((reply, index) => (
                        <div key={index} className="border-b border-white/5 last:border-0 pb-2">
                          <p className={`text-[11px] italic break-words break-all ${isDark ? 'text-orange-200/80' : 'text-orange-700'}`}>
                            "{reply.text || reply}"
                          </p>
                          <span className="text-[7px] uppercase opacity-30 mt-1 block">
                            {reply.created_at ? formatRelativeTime(reply.created_at) : 'recently'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* INPUT BOX */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Whisper a reply..."
                      className={`flex-1 border rounded-lg px-3 py-2 text-[10px] outline-none ${
                        isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-zinc-600' : 'bg-gray-50 border-gray-200 placeholder:text-gray-400'
                      }`}
                      value={whisperInput}
                      onChange={(e) => setWhisperInput(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        if (whisperInput.trim()) {
                          onWhisper(currentSecret.id, whisperInput);
                          setWhisperInput("");
                        }
                      }}
                      className={`text-[8px] font-bold uppercase tracking-widest transition-colors ${
                        isDark ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700'
                      }`}>
                      Reply
                    </button>
                  </div>
                </div>

                {/* FOOTER */}
{/* FOOTER */}
<div className={`flex flex-col gap-4 items-center border-t pt-4 ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
  <div className="flex justify-between items-center w-full px-4">
    <button 
      className="flex items-center" 
      onClick={() => onNod(currentSecret.id, currentSecret.nods)}
    >
      <div className={`w-3 h-3 rounded-full mr-2 transition-all duration-500 ${
        hasEchoed 
          ? 'bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' 
          : (isDark ? 'bg-zinc-600' : 'bg-gray-400')
      }`} />
      <span className={`text-[10px] tracking-widest uppercase ${hasEchoed ? 'text-purple-400' : 'text-zinc-500'}`}>
        {currentSecret.nods || 0} Echoes
      </span>
    </button>

    <span className={`text-[8px] uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-gray-500'}`}>
      {isVisited ? "Heard" : "Unheard"}
    </span>
  </div>

  {/* Listening Button */}
  <ListeningButton id={currentSecret.id} isListening={currentSecret.is_listening} />

  {/* NEW DELETE POSITION: Moved to bottom for better design flow */}
  {isMySecret && (
    <button
      onClick={() => onDelete(currentSecret.id)}
      className={`mt-2 w-full py-2 rounded-lg text-[8px] font-bold uppercase tracking-[0.3em] transition-all opacity-40 hover:opacity-100 flex items-center justify-center gap-2 ${
        isDark 
          ? 'text-red-400/50 hover:text-red-400' 
          : 'text-red-500'
      }`}
    >
      Release this secret
    </button>
  )}
</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}