import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { getMemoryIcon } from '../MapConfig';
import { formatRelativeTime } from '../utils/timeUtils';
import ListeningButton from './ListeningButton';
import L from 'leaflet';

export default function MapMarkers({ secrets, visited, isDark, onMarkAsVisited, onNod, onWhisper, onDelete }) {
  const [whisperInput, setWhisperInput] = useState("");
  const [threadIndices, setThreadIndices] = useState({});
  const [zoomLevel, setZoomLevel] = useState(4);
  const map = useMap();
  
  const scrollRef = useRef(null);
  const getActiveIndex = (markerId) => threadIndices[markerId] || 0;

  // Track zoom level
  useEffect(() => {
    const updateZoom = () => setZoomLevel(map.getZoom());
    map.on('zoomend', updateZoom);
    return () => map.off('zoomend', updateZoom);
  }, [map]);

  // Helper function to check if two coordinates are nearby (within ~50 meters)
  const areCoordinatesNearby = (lat1, lng1, lat2, lng2, thresholdKm = 0.05) => {
    const R = 6371;
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

  // Calculate grid-based clustering with viewport filtering
  const clusteredMarkers = useMemo(() => {
    // Get current map bounds to only show visible markers
    const bounds = map.getBounds();
    const visibleSecrets = secrets.filter(s => 
      bounds.contains([s.lat, s.lng])
    );

    // ONLY show individual markers at zoom 10+
    if (zoomLevel >= 12) {
      return visibleSecrets.map(s => ({
        position: [s.lat, s.lng],
        secrets: [s],
        isCluster: false,
      }));
    }

    // Grid size based on zoom level - ALWAYS cluster below zoom 10
    const gridSize = zoomLevel < 4 ? 10 : zoomLevel < 6 ? 5 : zoomLevel < 8 ? 2 : 0.5;
    const clusters = new Map();

    visibleSecrets.forEach(secret => {
      // Create grid cell key
      const latKey = Math.floor(secret.lat / gridSize) * gridSize;
      const lngKey = Math.floor(secret.lng / gridSize) * gridSize;
      const key = `${latKey},${lngKey}`;

      if (!clusters.has(key)) {
        clusters.set(key, {
          position: [latKey + gridSize/2, lngKey + gridSize/2],
          secrets: [],
          isCluster: true, // Always treat as cluster when zoomed out
        });
      }
      clusters.get(key).secrets.push(secret);
    });

    return Array.from(clusters.values());
  }, [secrets, zoomLevel, map]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [secrets]);

  return (
    <>
      {clusteredMarkers.map((cluster, idx) => {
        if (cluster.isCluster) {
          // CLUSTER MARKER WITH POPUP
          const count = cluster.secrets.length;
          const size = count > 50 ? 60 : count > 10 ? 50 : 40;
          
          const clusterIcon = L.divIcon({
            html: `
              <div style="
                position: relative;
                width: ${size}px;
                height: ${size}px;
                cursor: pointer;
              ">
                <!-- Outer pulse ring -->
                <div style="
                  position: absolute;
                  inset: -8px;
                  border-radius: 50%;
                  background: ${isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)'};
                  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                "></div>
                
                <!-- Main cluster circle -->
                <div style="
                  position: relative;
                  width: 100%;
                  height: 100%;
                  border-radius: 50%;
                  background: ${isDark 
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(168, 85, 247, 0.9))' 
                    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(168, 85, 247, 0.85))'
                  };
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  font-weight: 800;
                  color: white;
                  box-shadow: 
                    0 0 30px ${isDark ? 'rgba(139, 92, 246, 0.6)' : 'rgba(139, 92, 246, 0.4)'},
                    0 8px 24px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
                  border: 2px solid rgba(255, 255, 255, 0.4);
                  backdrop-filter: blur(8px);
                  transition: all 0.3s ease;
                ">
                  <span style="
                    font-size: ${size > 50 ? '22px' : size > 40 ? '18px' : '15px'};
                    line-height: 1;
                    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                  ">${count}</span>
                  <span style="
                    font-size: ${size > 50 ? '7px' : '6px'};
                    font-weight: 600;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    opacity: 0.9;
                    margin-top: 2px;
                  ">secrets</span>
                </div>
              </div>
              
              <style>
                @keyframes pulse-ring {
                  0%, 100% {
                    transform: scale(1);
                    opacity: 0.5;
                  }
                  50% {
                    transform: scale(1.3);
                    opacity: 0;
                  }
                }
              </style>
            `,
            className: 'cluster-marker',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });

          // Sort secrets by date (newest first)
          const sortedSecrets = [...cluster.secrets].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          );

          return (
            <Marker
              key={`cluster-${idx}`}
              position={cluster.position}
              icon={clusterIcon}
            >
              <Popup maxWidth={window.innerWidth < 768 ? 300 : 420} className="cluster-popup">
                <div className={`relative py-4 px-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <button 
                    onClick={() => map.closePopup()}
                    className={`absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full text-xl transition-all z-50 ${
                      isDark 
                        ? 'hover:bg-white/10 text-white/40 hover:text-white backdrop-blur-sm' 
                        : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    ×
                  </button>

                  {/* Header */}
                  <div className="text-center mb-4 pb-4 border-b border-from-green-600">
                    <div className="inline-flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-600  flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {count}
                      </div>
                      <h3 className={`text-base font-bold bg-gradient-to-r ${
                        isDark 
                          ? 'from-purple-400 to-pink-400' 
                          : 'from-purple-600 to-pink-600'
                      } bg-clip-text text-transparent`}>
                        Secrets in this area
                      </h3>
                    </div>
                    <p className="text-[10px] opacity-50">Tap any secret to reveal</p>
                  </div>

                  {/* Secrets List */}
                  <div className="max-h-[320px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {sortedSecrets.map((secret, i) => {
                      const isVisited = visited.includes(secret.id);
                      const echoedSecrets = JSON.parse(localStorage.getItem("nodded_secrets") || "[]");
                      const hasEchoed = echoedSecrets.includes(secret.id);
                      
                      return (
                        <button
                          key={secret.id}
                          onClick={() => {
                            map.closePopup();
                            setTimeout(() => {
                              map.setView([secret.lat, secret.lng], Math.max(zoomLevel, 10));
                              onMarkAsVisited(secret.id);
                            }, 100);
                          }}
                          className={`group w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg relative overflow-hidden ${
                            isDark 
                              ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-purple-500/30 hover:bg-white/10' 
                              : 'bg-gradient-to-br from-gray-50 to-white border-gray-200 hover:border-purple-300 hover:shadow-purple-200/50'
                          }`}
                        >
                          {/* Gradient accent on hover */}
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r ${
                            isDark ? 'from-purple-500/5 to-pink-500/5' : 'from-purple-500/10 to-pink-500/10'
                          }`} />
                          
                          <div className="relative flex items-start gap-3">
                            {/* Status Indicator */}
                            <div className="flex flex-col items-center gap-1 pt-1">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-lg ${
                                secret.is_listening 
                                  ? 'bg-orange-500 shadow-orange-500/50 animate-pulse' :
                                isVisited 
                                  ? 'bg-purple-500 shadow-purple-500/50' : 
                                  'bg-emerald-500 shadow-emerald-500/50'
                              }`} />
                              <div className={`h-full w-[1px] ${
                                isDark ? 'bg-white/10' : 'bg-gray-200'
                              }`} />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-[12px] font-serif italic line-clamp-2 mb-2 leading-relaxed ${
                                isDark ? 'text-white/90' : 'text-gray-800'
                              }`}>
                                "{secret.text.substring(0, 120)}{secret.text.length > 120 ? '...' : ''}"
                              </p>
                              
                              {/* Metadata */}
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className={`text-[9px] uppercase tracking-wider font-medium ${
                                  isDark ? 'text-purple-400/70' : 'text-purple-600/70'
                                }`}>
                                  {formatRelativeTime(secret.created_at)}
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] flex items-center gap-1 ${
                                    hasEchoed 
                                      ? 'text-purple-400 font-semibold' 
                                      : isDark ? 'text-white/40' : 'text-gray-500'
                                  }`}>
                                    ♥ {secret.nods || 0}
                                  </span>
                                  
                                  {secret.replies?.length > 0 && (
                                    <span className="text-[10px] flex items-center gap-1 text-orange-400 font-semibold">
                                      💬 {secret.replies.length}
                                    </span>
                                  )}
                                  
                                  {secret.is_listening && (
                                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold uppercase tracking-wide">
                                      Live
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Footer hint */}
                  <div className={`text-center mt-3 pt-3 border-t ${
                    isDark ? 'border-white/5' : 'border-gray-200'
                  }`}>
                    <p className="text-[9px] opacity-40 uppercase tracking-widest">
                      Zoom in to explore more
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        }

        // INDIVIDUAL MARKER (existing code)
        const s = cluster.secrets[0];
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
                
                <div 
                  className={`min-h-[60px] max-h-[250px] overflow-y-auto overflow-x-hidden mb-6 px-4 custom-scrollbar touch-pan-y`}
                  onWheel={(e) => e.stopPropagation()}
                >
                  <p className={`text-md md:text-lg font-serif italic leading-relaxed break-words whitespace-pre-wrap ${isDark ? 'text-white' : 'text-black'}`}>
                    "{currentSecret.text}"
                  </p>
                </div>

                <div className="mb-4 px-2">
                  {/* ALWAYS SHOW WHISPER THREAD BOX */}
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
                    
                    {/* Show message if no whispers yet */}
                    {!currentSecret.whispers && (!currentSecret.replies || currentSecret.replies.length === 0) && (
                      <p className="text-[10px] italic opacity-30 text-center py-2">
                        No whispers yet... be the first
                      </p>
                    )}
                  </div>

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

                <div className={`flex flex-col gap-4 items-center border-t pt-4 ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center w-full px-4">
                    <button 
                      className="flex items-center" 
                      onClick={() => onNod(currentSecret.id, currentSecret.nods)}
                    >
                      <div className={`w-3 h-3 rounded-full mr-2 transition-all duration-500 ${
                        hasEchoed 
                          ? 'bg-green-600 shadow-[0_0_10px_rgba(139,92,246,0.5)]' 
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

                  <ListeningButton id={currentSecret.id} isListening={currentSecret.is_listening} />

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