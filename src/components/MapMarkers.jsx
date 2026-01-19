import React, { useState, useEffect, useRef, useMemo } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import { getMemoryIcon } from "../MapConfig";
import { formatRelativeTime } from "../utils/timeUtils";
import ListeningButton from "./ListeningButton";
import L from "leaflet";

export default function MapMarkers({
  secrets,
  visited,
  isDark,
  onMarkAsVisited,
  onNod,
  onWhisper,
  onDelete,
}) {
  const [whisperInput, setWhisperInput] = useState("");
  const [threadIndices, setThreadIndices] = useState({});
  const [zoomLevel, setZoomLevel] = useState(4);

  const map = useMap();
  const scrollRef = useRef(null);
  const popupRef = useRef(null);

  // Track bounds in state (optimized)
  const [bounds, setBounds] = useState(() => map.getBounds());

  // Cluster icon cache
  const clusterIconCache = useRef(new Map());

  const getActiveIndex = (markerId) => threadIndices[markerId] || 0;

  // Show individual markers at >= this zoom
  const CLUSTER_OFF_ZOOM = 12;

  useEffect(() => {
    let frameId;
    
    const updateViewport = () => {
      frameId = requestAnimationFrame(() => {
        setBounds(map.getBounds());
        setZoomLevel(map.getZoom());
      });
    };

    map.on("move", updateViewport); 
    map.on("zoom", updateViewport);

    // Initial run
    updateViewport();

    return () => {
      map.off("move", updateViewport);
      map.off("zoom", updateViewport);
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

  // Cached cluster icon builder with improved animation
  const getClusterIcon = (count, clusterType = 'default') => {
    const size = count > 50 ? 60 : count > 10 ? 50 : 40;
    const key = `${count}-${size}-${isDark ? "dark" : "light"}-${clusterType}`;

    if (clusterIconCache.current.has(key)) {
      return clusterIconCache.current.get(key);
    }
    
    // Color scheme based on cluster type
    const colors = clusterType === 'listening' ? {
      ripple1: isDark ? "rgba(249, 115, 22, 0.15)" : "rgba(249, 115, 22, 0.1)",
      ripple2: isDark ? "rgba(249, 115, 22, 0.2)" : "rgba(249, 115, 22, 0.15)",
      gradient: isDark 
        ? "linear-gradient(135deg, rgba(249, 115, 22, 0.95), rgba(251, 146, 60, 0.9))"
        : "linear-gradient(135deg, rgba(249, 115, 22, 0.9), rgba(251, 146, 60, 0.85))",
      glow: isDark ? "rgba(249, 115, 22, 0.5)" : "rgba(249, 115, 22, 0.3)",
      textGlow: "rgba(249, 115, 22, 0.6)"
    } : clusterType === 'echoed' ? {
      ripple1: isDark ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.1)",
      ripple2: isDark ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.15)",
      gradient: isDark 
        ? "linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(168, 85, 247, 0.9))"
        : "linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(168, 85, 247, 0.85))",
      glow: isDark ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.3)",
      textGlow: "rgba(139, 92, 246, 0.6)"
    } : {
      ripple1: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)",
      ripple2: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)",
      gradient: isDark 
        ? "linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.9))"
        : "linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.85))",
      glow: isDark ? "rgba(16, 185, 129, 0.5)" : "rgba(16, 185, 129, 0.3)",
      textGlow: "rgba(16, 185, 129, 0.6)"
    };

    const icon = L.divIcon({
      html: `
        <div style="
          position: relative;
          width: ${size}px;
          height: ${size}px;
          cursor: zoom-in;
        ">
          <div style="
            position: absolute;
            inset: -12px;
            border-radius: 50%;
            background: ${colors.ripple1};
            animation: ripple 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          "></div>
          
          <div style="
            position: absolute;
            inset: -8px;
            border-radius: 50%;
            background: ${colors.ripple2};
            animation: ripple 3s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.5s;
          "></div>

          <div style="
            position: relative;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: ${colors.gradient};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            color: white;
            box-shadow:
              0 0 40px ${colors.glow},
              0 10px 30px rgba(0, 0, 0, 0.3),
              inset 0 2px 4px rgba(255, 255, 255, 0.2);
            border: 3px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: float 4s ease-in-out infinite${clusterType === 'listening' ? ', pulse 2s ease-in-out infinite' : ''};
          ">
            <span style="
              font-size: ${size > 50 ? "26px" : size > 40 ? "20px" : "16px"};
              line-height: 1;
              text-shadow: 
                0 2px 10px rgba(0, 0, 0, 0.4),
                0 0 20px ${colors.textGlow};
              filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
            ">${count}</span>
          </div>
        </div>

        <style>
          @keyframes ripple {
            0% { 
              transform: scale(0.8); 
              opacity: 0.6; 
            }
            50% { 
              transform: scale(1.4); 
              opacity: 0; 
            }
            100% { 
              transform: scale(0.8); 
              opacity: 0; 
            }
          }
          
          @keyframes float {
            0%, 100% { 
              transform: translateY(0px) scale(1);
            }
            50% { 
              transform: translateY(-5px) scale(1.05);
            }
          }
          
          @keyframes pulse {
            0%, 100% { 
              opacity: 1;
            }
            50% { 
              opacity: 0.7;
            }
          }
        </style>
      `,
      className: "cluster-marker",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    clusterIconCache.current.set(key, icon);
    return icon;
  };

  // Optimized clustering (viewport filtered + grid clustering)
  const clusteredMarkers = useMemo(() => {
    if (!bounds || !secrets?.length) return [];

    // Collect only visible secrets
    const visible = [];
    for (let i = 0; i < secrets.length; i++) {
      const s = secrets[i];
      if (bounds.contains([s.lat, s.lng])) visible.push(s);
    }

    // Show individual markers at high zoom
    if (zoomLevel >= CLUSTER_OFF_ZOOM) {
      return visible.map((s) => ({
        position: [s.lat, s.lng],
        secrets: [s],
        isCluster: false,
      }));
    }

    // Grid size by zoom level
    const gridSize =
      zoomLevel < 4
        ? 10
        : zoomLevel < 6
        ? 5
        : zoomLevel < 8
        ? 2
        : zoomLevel < 10
        ? 0.8
        : 0.5;

    const clusters = new Map();

    for (let i = 0; i < visible.length; i++) {
      const s = visible[i];

      const latKey = Math.floor(s.lat / gridSize);
      const lngKey = Math.floor(s.lng / gridSize);
      const key = latKey + ":" + lngKey;

      let c = clusters.get(key);
      if (!c) {
        c = {
          position: [0, 0],
          secrets: [],
          isCluster: true,
        };
        clusters.set(key, c);
      }
      c.secrets.push(s);
    }

    // Calculate centroid for each cluster
    const clusterArray = Array.from(clusters.values());
    clusterArray.forEach(cluster => {
      const avgLat = cluster.secrets.reduce((sum, s) => sum + s.lat, 0) / cluster.secrets.length;
      const avgLng = cluster.secrets.reduce((sum, s) => sum + s.lng, 0) / cluster.secrets.length;
      cluster.position = [avgLat, avgLng];
    });

    return clusterArray;
  }, [secrets, bounds, zoomLevel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [secrets]);

  return (
    <>
      {clusteredMarkers.map((cluster, idx) => {
        // CLUSTER MARKER
        if (cluster.isCluster) {
          const count = cluster.secrets.length;
          
          const hasListening = cluster.secrets.some(s => s.is_listening);
          
          const echoedSecrets = JSON.parse(localStorage.getItem("nodded_secrets") || "[]");
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

        // INDIVIDUAL MARKER
        const s = cluster.secrets[0];
        const secretsAtLocation = secrets
          .filter((other) =>
            areCoordinatesNearby(s.lat, s.lng, other.lat, other.lng)
          )
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const isLatestAtLocation = s.id === secretsAtLocation[0].id;
        if (!isLatestAtLocation) return null;

        const currentIndex = getActiveIndex(s.id);
        const currentSecret = secretsAtLocation[currentIndex];

        const weight = Math.min(
          (currentSecret.text?.length || 0) / 4 + (currentSecret.nods || 0) * 3,
          40
        );
        const echoedSecrets = JSON.parse(
          localStorage.getItem("nodded_secrets") || "[]"
        );
        const hasEchoed = echoedSecrets.includes(currentSecret.id);
        const isVisited = visited.includes(currentSecret.id);

        const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
        const isMySecret = mySecrets.includes(currentSecret.id);

        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={getMemoryIcon(
              currentSecret.is_listening,
              isVisited,
              weight,
              isDark
            )}
            eventHandlers={{
              click: () => {
                onMarkAsVisited(currentSecret.id);
                setThreadIndices((prev) => ({ ...prev, [s.id]: 0 }));
              },
            }}
          >
            <Popup
              ref={popupRef}
              maxWidth={window.innerWidth < 768 ? 280 : 350}
              minWidth={window.innerWidth < 768 ? 280 : 350}
              maxHeight={window.innerHeight * 0.8}
              onClose={() => setWhisperInput("")}
              autoPan={true}
              keepInView={true}
              closeButton={false}
              closeOnClick={false}
              autoClose={false}
            >
              <div
                className={`relative py-4 px-1 text-center ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
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
                  className={`min-h-[60px] max-h-[160px] overflow-y-auto overflow-x-hidden mb-6 px-4 custom-scrollbar`}
                  style={{ 
                    touchAction: 'pan-y',
                    overscrollBehavior: 'contain'
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    map.dragging.disable();
                    map.touchZoom.disable();
                    map.doubleClickZoom.disable();
                    map.scrollWheelZoom.disable();
                  }}
                  onTouchEnd={() => {
                    map.dragging.enable();
                    map.touchZoom.enable();
                    map.doubleClickZoom.enable();
                    map.scrollWheelZoom.enable();
                  }}
                >
                  <p
                    className={`text-md md:text-lg font-serif italic leading-relaxed break-words whitespace-pre-wrap ${
                      isDark ? "text-white" : "text-black"
                    }`}
                  >
                    "{currentSecret.text}"
                  </p>
                </div>

                <div className="mb-4 px-2">
                  <div
                    ref={scrollRef}
                    className={`max-h-35 md:max-h-28 overflow-y-auto overflow-x-hidden mb-2 p-2 rounded-xl border text-left flex flex-col gap-3 custom-scrollbar ${
                      isDark
                        ? "bg-white/5 border-white/10"
                        : "bg-gray-50 border-gray-100"
                    }`}
                    style={{ 
                      touchAction: 'pan-y',
                      overscrollBehavior: 'contain'
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      map.dragging.disable();
                      map.touchZoom.disable();
                      map.doubleClickZoom.disable();
                      map.scrollWheelZoom.disable();
                    }}
                    onTouchEnd={() => {
                      map.dragging.enable();
                      map.touchZoom.enable();
                      map.doubleClickZoom.enable();
                      map.scrollWheelZoom.enable();
                    }}
                    onMouseEnter={() => {
                      map.dragging.disable();
                      map.scrollWheelZoom.disable();
                    }}
                    onMouseLeave={() => {
                      map.dragging.enable();
                      map.scrollWheelZoom.enable();
                    }}
                  >
                    <p className="text-[8px] uppercase tracking-widest opacity-40 top-0 bg-inherit z-10 py-1">
                      Whisper Thread
                    </p>

                    {currentSecret.whispers && (
                      <div className="border-b border-white/5 pb-2">
                        <p
                          className={`text-[11px] italic break-words break-all ${
                            isDark
                              ? "text-orange-200/80"
                              : "text-orange-700"
                          }`}
                        >
                          "{currentSecret.whispers}"
                        </p>
                        <span className="text-[7px] uppercase opacity-30 mt-1 block">
                          Original Whisper
                        </span>
                      </div>
                    )}

                    {currentSecret.replies?.map((reply, index) => (
                      <div
                        key={index}
                        className="border-b border-white/5 last:border-0 pb-2"
                      >
                        <p
                          className={`text-[11px] italic break-words break-all ${
                            isDark
                              ? "text-orange-200/80"
                              : "text-orange-700"
                          }`}
                        >
                          "{reply.text || reply}"
                        </p>
                        <span className="text-[7px] uppercase opacity-30 mt-1 block">
                          {reply.created_at
                            ? formatRelativeTime(reply.created_at)
                            : "recently"}
                        </span>
                      </div>
                    ))}

                    {!currentSecret.whispers &&
                      (!currentSecret.replies ||
                        currentSecret.replies.length === 0) && (
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
                        if (whisperInput.trim()) {
                          onWhisper(currentSecret.id, whisperInput);
                          setWhisperInput("");
                        }
                      }}
                      className={`text-[8px] font-bold uppercase tracking-widest transition-colors ${
                        isDark
                          ? "text-orange-400 hover:text-orange-300"
                          : "text-orange-600 hover:text-orange-700"
                      }`}
                    >
                      Reply
                    </button>
                  </div>
                </div>

                <div
                  className={`flex flex-col gap-4 items-center border-t pt-4 ${
                    isDark ? "border-white/5" : "border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-center w-full px-4">
                    <button
                      className="flex items-center"
                      onClick={() => onNod(currentSecret.id, currentSecret.nods)}
                    >
                      <div
                        className={`w-3 h-3 rounded-full mr-2 transition-all duration-500 ${
                          hasEchoed
                            ? "bg-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                            : isDark
                            ? "bg-zinc-600"
                            : "bg-gray-400"
                        }`}
                      />
                      <span
                        className={`text-[10px] tracking-widest uppercase ${
                          hasEchoed ? "text-purple-400" : "text-zinc-500"
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
                      {isVisited ? "Heard" : "Unheard"}
                    </span>
                  </div>

                  {/* Force re-render by using key */}
                  <ListeningButton
                    key={`listening-${currentSecret.id}-${currentSecret.is_listening}`}
                    id={currentSecret.id}
                    isListening={currentSecret.is_listening}
                  />

                  {isMySecret && (
                    <button
                      onClick={() => onDelete(currentSecret.id)}
                      className={`mt-2 w-full py-2 rounded-lg text-[8px] font-bold uppercase tracking-[0.3em] transition-all opacity-40 hover:opacity-100 flex items-center justify-center gap-2 ${
                        isDark
                          ? "text-red-400/50 hover:text-red-400"
                          : "text-red-500"
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