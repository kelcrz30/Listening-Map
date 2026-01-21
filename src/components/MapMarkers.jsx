  import React, { useState, useEffect, useRef, useMemo } from "react";
  import { Marker, Popup, useMap } from "react-leaflet";
  import { getMemoryIcon } from "../MapConfig";
  import { formatRelativeTime } from "../utils/timeUtils";
  import ListeningButton from "./ListeningButton";
  import L from "leaflet";
  import DeleteSecretModal from './DeleteSecretModal';
  export default function MapMarkers({
    secrets,
    visited,
    isDark,
    onMarkAsVisited,
    onNod,
    onWhisper,
    onDelete,
    activeSecretId, 
    setActiveSecretId,
  }) {
    const [whisperInput, setWhisperInput] = useState("");
    const [threadIndices, setThreadIndices] = useState({});
    const [zoomLevel, setZoomLevel] = useState(4);
    const [activePopupId, setActivePopupId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [secretToDelete, setSecretToDelete] = useState(null);
    const map = useMap();
    const scrollRef = useRef(null);
    const popupRef = useRef(null);
    const markerRefs = useRef({});

    // Track bounds in state (optimized)
    const [bounds, setBounds] = useState(() => map.getBounds());

    // Cluster icon cache - now persistent
    const clusterIconCache = useRef(new Map());

    const getActiveIndex = (markerId) => threadIndices[markerId] || 0;

    // Show individual markers at >= this zoom
    const CLUSTER_OFF_ZOOM = 12;


    useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (secrets.length > 0) {
      const latestSecret = secrets[secrets.length - 1];
      if ("Notification" in window && Notification.permission === "granted") {
        const isNew = new Date(latestSecret.created_at) > new Date(Date.now() - 10000);
        if (isNew) {
          new Notification("A new secret drifted in nearby", {
            body: latestSecret.text.substring(0, 40) + "...",
            icon: "/logo192.png" 
          });
        }
      }
    }
  }, [secrets.length]);
    useEffect(() => {
      if (activeSecretId) {
        const secretData = secrets.find(s => s.id === activeSecretId);
        if (!secretData) return;

        const targetLatLng = [secretData.lat, secretData.lng];
        
        // First, ensure we're zoomed in enough to see individual markers
        const targetZoom = Math.max(map.getZoom(), CLUSTER_OFF_ZOOM + 1);
        
        map.flyTo(targetLatLng, targetZoom, {
          duration: 1.5,
          easeLinearity: 0.25
        });

        const onMoveEnd = () => {
          // Wait a bit longer to ensure marker is rendered
          setTimeout(() => {
            const marker = markerRefs.current[activeSecretId];
            if (marker) {
              marker.openPopup();
              onMarkAsVisited(activeSecretId);
              setActivePopupId(activeSecretId);
            }
            setActiveSecretId(null);
          }, 200);
          
          map.off("moveend", onMoveEnd);
        };

        map.on("moveend", onMoveEnd);

        return () => map.off("moveend", onMoveEnd);
      }
    }, [activeSecretId, map, secrets, setActiveSecretId, onMarkAsVisited]);

    useEffect(() => {
      let frameId;
      let lastUpdate = 0;
      const THROTTLE_MS = 100;
      
      const updateViewport = () => {
        const now = Date.now();
        if (now - lastUpdate < THROTTLE_MS) return;
        
        lastUpdate = now;
        frameId = requestAnimationFrame(() => {
          setBounds(map.getBounds());
          setZoomLevel(map.getZoom());
        });
      };

      map.on("moveend", updateViewport); 
      map.on("zoomend", updateViewport);

      updateViewport();

      return () => {
        map.off("moveend", updateViewport);
        map.off("zoomend", updateViewport);
        if (frameId) cancelAnimationFrame(frameId);
      };
    }, [map]);

    // Helper function to check if two coordinates are nearby (within ~50 meters)
    const areCoordinatesNearby = (
      lat1,
      lng1,
      lat2,
      lng2,
      thresholdKm = 0.05
    ) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return distance <= thresholdKm;
    };

    // Simplified cluster icon with subtle glow
    const getClusterIcon = (count, clusterType = 'default') => {
      const size = count > 50 ? 60 : count > 10 ? 50 : 40;
      const key = `${count}-${size}-${isDark ? "dark" : "light"}-${clusterType}`;

      if (clusterIconCache.current.has(key)) {
        return clusterIconCache.current.get(key);
      }

      const colors = clusterType === 'listening'
        ? {
            bg: isDark ? "rgba(249, 115, 22, 0.9)" : "rgba(249, 115, 22, 0.85)",
            border: "rgba(255, 255, 255, 0.3)",
            glow: isDark ? "0 0 20px rgba(249, 115, 22, 0.6), 0 0 40px rgba(249, 115, 22, 0.3)" : "0 0 15px rgba(249, 115, 22, 0.4), 0 0 30px rgba(249, 115, 22, 0.2)"
          }
        : clusterType === 'echoed'
        ? {
            bg: isDark ? "rgba(139, 92, 246, 0.9)" : "rgba(139, 92, 246, 0.85)",
            border: "rgba(255, 255, 255, 0.3)",
            glow: isDark ? "0 0 20px rgba(139, 92, 246, 0.6), 0 0 40px rgba(139, 92, 246, 0.3)" : "0 0 15px rgba(139, 92, 246, 0.4), 0 0 30px rgba(139, 92, 246, 0.2)"
          }
        : {
            bg: isDark ? "rgba(16, 185, 129, 0.9)" : "rgba(16, 185, 129, 0.85)",
            border: "rgba(255, 255, 255, 0.3)",
            glow: isDark ? "0 0 20px rgba(16, 185, 129, 0.6), 0 0 40px rgba(16, 185, 129, 0.3)" : "0 0 15px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.2)"
          };

      const icon = L.divIcon({
        html: `<div style="
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: ${colors.bg};
          border: 2px solid ${colors.border};
          box-shadow: ${colors.glow};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          <span style="
            color: white;
            font-weight: bold;
            font-size: ${count > 40 ? "18px" : "14px"};
            line-height: 1;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          ">${count}</span>
        </div>`,
        className: "cluster-marker-simple",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      clusterIconCache.current.set(key, icon);
      return icon;
    };

    // Optimized clustering with better grid calculation
    const clusteredMarkers = useMemo(() => {
      if (!bounds || !secrets?.length) return [];

      // Sanitize coordinates
      const sanitized = secrets.map(s => ({
        ...s,
        lat: Number(s.lat),
        lng: Number(s.lng)
      })).filter(s => !isNaN(s.lat) && !isNaN(s.lng));

      // Filter for visible area
      const visible = sanitized.filter(s => bounds.contains([s.lat, s.lng]));

      // Show individual markers at high zoom
      if (zoomLevel >= CLUSTER_OFF_ZOOM) {
        return visible.map((s) => ({
          position: [s.lat, s.lng],
          secrets: [s],
          isCluster: false,
          secretId: s.id,
        }));
      }

      // Adaptive grid size
      const gridSize =
        zoomLevel < 4 ? 10 :
        zoomLevel < 6 ? 5 :
        zoomLevel < 8 ? 2 :
        zoomLevel < 10 ? 0.8 : 0.5;

      const clusters = new Map();

      visible.forEach(s => {
        const latKey = Math.floor(s.lat / gridSize);
        const lngKey = Math.floor(s.lng / gridSize);
        const key = `${latKey}:${lngKey}`;

        let cluster = clusters.get(key);
        if (!cluster) {
          cluster = {
            position: [s.lat, s.lng],
            secrets: [],
            isCluster: true,
            latSum: 0,
            lngSum: 0
          };
          clusters.set(key, cluster);
        }
        
        cluster.secrets.push(s);
        cluster.latSum += s.lat;
        cluster.lngSum += s.lng;
      });

      const result = [];
      clusters.forEach(cluster => {
        const count = cluster.secrets.length;
        cluster.position = [
          cluster.latSum / count,
          cluster.lngSum / count
        ];
        result.push(cluster);
      });

      return result;
    }, [secrets, bounds, zoomLevel]);

    // Cache echoed and my secrets
    const echoedSecrets = useMemo(() => 
      JSON.parse(localStorage.getItem("nodded_secrets") || "[]"),
      [activePopupId]
    );

    const mySecrets = useMemo(() =>
      JSON.parse(localStorage.getItem("my_secrets") || "[]"),
      [activePopupId]
    );

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [secrets]);

    // Helper function to safely get reply count
    const getReplyCount = (secret) => {
      try {
        if (Array.isArray(secret.replies)) {
          return secret.replies.length;
        } else if (typeof secret.replies === 'string') {
          const parsed = JSON.parse(secret.replies || "[]");
          return Array.isArray(parsed) ? parsed.length : 0;
        }
        return 0;
      } catch (e) {
        return 0;
      }
    };

    return (
      <>
        {clusteredMarkers.map((cluster, idx) => {
          if (cluster.isCluster) {
            const count = cluster.secrets.length;
            
            const hasListening = cluster.secrets.some(s => s.is_listening);
            const hasEchoed = cluster.secrets.some(s => echoedSecrets.includes(s.id));
            
            const clusterType = hasListening ? 'listening' : hasEchoed ? 'echoed' : 'default';

            return (
              <Marker
                key={`cluster-${idx}`}
                position={cluster.position}
                icon={getClusterIcon(count, clusterType)}
                eventHandlers={{
                  click: () => {
                    const targetZoom = Math.min(zoomLevel + 3, CLUSTER_OFF_ZOOM);
                    map.setView(cluster.position, targetZoom, {
                      animate: true,
                      duration: 0.5
                    });
                  }
                }}
              />
            );
          }

          // Individual marker rendering
          const s = cluster.secrets[0];

          const weight = Math.min(
            (s.text?.length || 0) / 4 + (s.nods || 0) * 3,
            40
          );
          
          const hasEchoed = echoedSecrets.includes(s.id);
          const isVisited = visited.includes(s.id);
          const isMySecret = mySecrets.includes(s.id);

          return (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              ref={(el) => {
                if (el) markerRefs.current[s.id] = el;
              }}
              icon={getMemoryIcon(
                s.is_listening,
                isVisited,
                weight,
                isDark
              )}
              eventHandlers={{
                click: () => {
                  onMarkAsVisited(s.id);
                  setActivePopupId(s.id);
                },
              }}
            >
              <Popup
                ref={popupRef}
                maxWidth={240}
                minWidth={240}
                maxHeight={500}
                onClose={() => {
                  setWhisperInput("");
                  setActivePopupId(null);
                }}
                autoPan={false} 
                keepInView={false}
                closeOnClick={false}
                className="interactive-popup"
              > 
                <div
                  className={`relative py-4 px-1 text-center ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  <button
                    onClick={() => map.closePopup()}
                    className={`absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg text-xl transition-all z-50 ${
                      isDark
                        ? "hover:bg-white/10 text-white/40 hover:text-white"
                        : "hover:bg-gray-100 text-gray-400 hover:text-gray-900"
                    }`}
                  >
                    ×
                  </button>

                  {(() => {
  // 1. Get the list of secrets at this spot
  const secretsAtLocation = secrets
    .filter((other) =>
      areCoordinatesNearby(s.lat, s.lng, other.lat, other.lng)
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const currentIndex = getActiveIndex(s.id);
  
  // 2. CRITICAL FIX: Find the LATEST data from the global 'secrets' prop 
  // instead of just using the one from the filtered list.
  const baseSecret = secretsAtLocation[currentIndex] || s;
  const currentSecret = secrets.find(sec => sec.id === baseSecret.id) || baseSecret;
  
  const replyCount = getReplyCount(currentSecret);

                    return (
                      <>
                        {secretsAtLocation.length > 1 && (
                          <div
                            className={`grid grid-cols-3 items-center mb-4 pb-2 border-b px-2 ${
                              isDark ? "border-white/10" : "border-black/5"
                            }`}
                          >
                            <button
                              disabled={currentIndex === secretsAtLocation.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setThreadIndices((prev) => ({
                                  ...prev,
                                  [s.id]: currentIndex + 1,
                                }));
                              }}
                              className="text-[9px] uppercase opacity-50 disabled:opacity-5"
                            >
                              ← Older
                            </button>

                            <span className="text-[9px] font-mono opacity-40 uppercase">
                              {currentIndex + 1} / {secretsAtLocation.length}
                            </span>

                            <button
                              disabled={currentIndex === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setThreadIndices((prev) => ({
                                  ...prev,
                                  [s.id]: currentIndex - 1,
                                }));
                              }}
                              className="text-[9px] uppercase opacity-50 disabled:opacity-5"
                            >
                              Newer →
                            </button>
                          </div>
                        )}

                        <span
                          className={`text-[8px] uppercase tracking-widest mb-2 block ${
                            isDark ? "text-zinc-500" : "text-gray-400"
                          }`}
                        >
                          drifted {formatRelativeTime(currentSecret.created_at)}
                        </span>

                        <div
                          className={`min-h-[60px] max-h-[80px] overflow-y-auto overflow-x-hidden mb-6 px-4 custom-scrollbar`}
                          style={{ 
                            overscrollBehavior: 'contain',
                            WebkitOverflowScrolling: 'touch'
                          }}
                        >
                          <p
                            className={`text-lg md:text-lg font-serif italic leading-relaxed break-words whitespace-pre-wrap ${
                              isDark ? "text-white" : "text-black"
                            }`}
                          >
                            "{currentSecret.text}"
                          </p>
                        </div>

                        <div className="mb-4 px-2">
                          <div
                            ref={scrollRef}
                            className={`max-h-24 overflow-y-auto overflow-x-hidden mb-2 p-2 rounded-xl border text-left flex flex-col gap-3 custom-scrollbar ${
                              isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"
                            }`}
                            style={{ 
                              overscrollBehavior: 'contain',
                              WebkitOverflowScrolling: 'touch'
                            }}
                            onWheel={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <p className="text-[8px] uppercase tracking-widest pt-0 opacity-40 top-0 bg-inherit z-10 py-1">
                              Whisper Thread ({replyCount}/10)
                            </p>

                        {currentSecret.whispers && (
  <div className="border-b border-white/5 pb-2">
    <p className={`text-[11px] italic break-words break-all ${isDark ? "text-orange-200/80" : "text-orange-700"}`}>
      "{currentSecret.whispers}"
    </p>
    <span className="text-[7px] uppercase opacity-30 mt-1 block">Original Whisper</span>
  </div>
)}

{(() => {
  // Use useMemo style logic or ensure safeReplies is always derived from the latest currentSecret
  let safeReplies = [];
  try {
    const rawReplies = currentSecret.replies;
    safeReplies = Array.isArray(rawReplies) 
      ? rawReplies 
      : JSON.parse(rawReplies || "[]");
  } catch (e) { safeReplies = []; }

  return safeReplies.length > 0 ? (
    safeReplies.map((reply, index) => (
      // Use a unique ID if available, otherwise index is okay here
      <div key={`reply-${currentSecret.id}-${index}`} className="border-b border-white/5 last:border-0 pb-2">
        <p className={`text-[11px] italic break-words break-all ${isDark ? "text-orange-200/80" : "text-orange-700"}`}>
          "{reply.text || (typeof reply === 'string' ? reply : '')}"
        </p>
        <span className="text-[7px] uppercase opacity-30 mt-1 block">
          {reply.created_at ? formatRelativeTime(reply.created_at) : "recently"}
        </span>
      </div>
    ))
  ) : null;
})()}
                          </div>

                          {replyCount < 10 ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Whisper a reply..."
                                className={`flex-1 border rounded-lg px-4 py-2 text-[10px] outline-none ${
                                  isDark
                                    ? "bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                                    : "bg-gray-50 border-gray-200 placeholder:text-gray-400"
                                }`}
                                value={whisperInput}
                                onChange={(e) => setWhisperInput(e.target.value)}
                                onTouchStart={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={() => {
                                  if (whisperInput.trim() && replyCount < 10) {
                                    onWhisper(currentSecret.id, whisperInput);
                                    setWhisperInput("");
                                  }
                                }}
                                className={`text-[8px] font-bold uppercase tracking-widest transition-colors ${
                                  isDark ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"
                                }`}
                              >
                                Reply
                              </button>
                            </div>
                          ) : (
                            <div className={`py-2 px-3 rounded-lg border text-center ${
                              isDark ? "bg-red-500/5 border-red-500/20" : "bg-red-50 border-red-100"
                            }`}>
                              <p className="text-[9px] uppercase tracking-tighter text-red-500/60 font-bold">
                                This thread has reached its limit
                              </p>
                            </div>
                          )}
                        </div>

                        <div
                          className={`flex flex-col items-center border-t pt-4 ${
                            isDark ? "border-white/5" : "border-gray-200"
                          }`}
                        >
                          <div className="flex justify-between items-center w-full px-4 mb-2">
                            <button
                              className="flex items-center"
                              onClick={() => onNod(currentSecret.id, currentSecret.nods)}
                            >
                              <div
                                className={`w-3 h-3 rounded-full mr-2 transition-all duration-300 ${
                                  echoedSecrets.includes(currentSecret.id)
                                    ? "bg-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                                    : isDark
                                    ? "bg-zinc-600"
                                    : "bg-gray-400"
                                }`}
                              />
                              <span
                                className={`text-[10px] tracking-widest uppercase ${
                                  echoedSecrets.includes(currentSecret.id) ? "text-purple-400" : "text-zinc-500"
                                }`}
                              >
                                {currentSecret.nods || 0} Echoes
                              </span>
                            </button>

                            <span
                              className={`text-[8px] uppercase tracking-widest ${
                                isDark ? "text-zinc-600" : "text-gray-500"
                              }`}
                            >
                              {visited.includes(currentSecret.id) ? "Heard" : "Unheard"}
                            </span>
                          </div>
                          
                          <ListeningButton
                            key={`listening-${currentSecret.id}-${currentSecret.is_listening}`}
                            id={currentSecret.id}
                            isListening={currentSecret.is_listening}
                          />

      {mySecrets.includes(currentSecret.id) && (
    <>
  {/* CHANGE THIS LINE */}
  {currentSecret.post_pin && (
    <>
      <button
        onClick={() => {
          setSecretToDelete(currentSecret.id);
          setDeleteModalOpen(true);
        }}
        className={`mt-2 w-full py-2 rounded-lg text-[8px] font-bold uppercase tracking-[0.3em] transition-all opacity-40 hover:opacity-100 flex items-center justify-center gap-2 ${
          isDark ? "text-red-400/50 hover:text-red-400" : "text-red-500"
        }`}
      >
        Release this secret
      </button>
      
      <DeleteSecretModal
        isOpen={deleteModalOpen && secretToDelete === currentSecret.id}
        onClose={() => {
          setDeleteModalOpen(false);
          setSecretToDelete(null);
        }}
        onConfirm={(pin) => {
          onDelete(currentSecret.id, pin);
          setDeleteModalOpen(false);
          setSecretToDelete(null);
          map.closePopup();
        }}
        isDark={isDark}
      />
    </>
  )}
      
      <DeleteSecretModal
        isOpen={deleteModalOpen && secretToDelete === currentSecret.id}
        onClose={() => {
          setDeleteModalOpen(false);
          setSecretToDelete(null);
        }}
        onConfirm={(pin) => {
          onDelete(currentSecret.id, pin);
          setDeleteModalOpen(false);
          setSecretToDelete(null);
          map.closePopup();
        }}
        isDark={isDark}
      />
    </>
  )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </>
    );
  }