import React, { useState, useEffect, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Custom cluster icon styling
const createClusterCustomIcon = (cluster, isDark) => {
  const count = cluster.getChildCount();
  let size = 'small';
  if (count > 10) size = 'medium';
  if (count > 50) size = 'large';
  
  return L.divIcon({
    html: `<div style="
      background: ${isDark ? 'rgba(34, 211, 238, 0.8)' : 'rgba(6, 182, 212, 0.8)'};
      width: ${size === 'large' ? '60px' : size === 'medium' ? '50px' : '40px'};
      height: ${size === 'large' ? '60px' : size === 'medium' ? '50px' : '40px'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      font-size: ${size === 'large' ? '18px' : size === 'medium' ? '16px' : '14px'};
      box-shadow: 0 0 20px ${isDark ? 'rgba(34, 211, 238, 0.5)' : 'rgba(6, 182, 212, 0.5)'};
      border: 2px solid white;
      transition: all 0.3s ease;
    ">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(
      size === 'large' ? 60 : size === 'medium' ? 50 : 40,
      size === 'large' ? 60 : size === 'medium' ? 50 : 40
    ),
  });
};

export default function MapMarkersWithClustering({ 
  secrets, 
  visited, 
  isDark, 
  onMarkAsVisited, 
  onNod, 
  onWhisper, 
  onDelete,
  formatRelativeTime,
  getMemoryIcon 
}) {
  const map = useMap();
  const clusterGroupRef = useRef(null);
  const [whisperInputs, setWhisperInputs] = useState({});
  const [threadIndices, setThreadIndices] = useState({});

  useEffect(() => {
    // Initialize cluster group
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 60, // Adjust clustering distance
        iconCreateFunction: (cluster) => createClusterCustomIcon(cluster, isDark),
      });
      map.addLayer(clusterGroupRef.current);
    }

    // Clear existing markers
    clusterGroupRef.current.clearLayers();

    // Group secrets by location
    const locationGroups = new Map();
    secrets.forEach((s) => {
      const key = `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`;
      if (!locationGroups.has(key)) {
        locationGroups.set(key, []);
      }
      locationGroups.get(key).push(s);
    });

    // Create markers for each location group
    locationGroups.forEach((secretsAtLocation, locKey) => {
      secretsAtLocation.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latest = secretsAtLocation[0];
      
      const currentIndex = threadIndices[latest.id] || 0;
      const currentSecret = secretsAtLocation[currentIndex];
      
      const weight = Math.min((currentSecret.text?.length || 0) / 4 + (currentSecret.nods || 0) * 3, 40);
      const echoedSecrets = JSON.parse(localStorage.getItem("nodded_secrets") || "[]");
      const hasEchoed = echoedSecrets.includes(currentSecret.id);
      const isVisited = visited.includes(currentSecret.id);
      const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
      const isMySecret = mySecrets.includes(currentSecret.id);

      const marker = L.marker([latest.lat, latest.lng], {
        icon: getMemoryIcon(currentSecret.is_listening, isVisited, weight, isDark)
      });

      // Create popup content
      const popupContent = document.createElement('div');
      popupContent.className = `relative py-4 px-1 text-center ${isDark ? 'text-white' : 'text-gray-900'}`;
      popupContent.style.minWidth = window.innerWidth < 768 ? '260px' : '350px';
      
      // Build popup HTML
      popupContent.innerHTML = `
        <button class="close-btn absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg text-xl transition-all z-50 ${
          isDark ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'
        }">×</button>

        ${secretsAtLocation.length > 1 ? `
          <div class="grid grid-cols-3 items-center mb-4 pb-2 border-b px-2 ${isDark ? 'border-white/10' : 'border-black/5'}">
            <button class="older-btn text-[9px] uppercase opacity-50 disabled:opacity-5" ${currentIndex === secretsAtLocation.length - 1 ? 'disabled' : ''}>← Older</button>
            <span class="text-[9px] font-mono opacity-40 uppercase">${currentIndex + 1} / ${secretsAtLocation.length}</span>
            <button class="newer-btn text-[9px] uppercase opacity-50 disabled:opacity-5" ${currentIndex === 0 ? 'disabled' : ''}>Newer →</button>
          </div>
        ` : ''}

        <span class="text-[8px] uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-gray-400'}">
          drifted ${formatRelativeTime(currentSecret.created_at)}
        </span>
        
        <div class="min-h-[60px] max-h-[250px] overflow-y-auto overflow-x-hidden mb-6 px-4">
          <p class="text-md md:text-lg font-serif italic leading-relaxed break-words whitespace-pre-wrap ${isDark ? 'text-white' : 'text-black'}">
            "${currentSecret.text}"
          </p>
        </div>

        <div class="mb-4 px-2">
          ${(currentSecret.replies?.length > 0 || currentSecret.whispers) ? `
            <div class="max-h-32 md:max-h-40 overflow-y-auto overflow-x-hidden mb-4 p-3 rounded-xl border text-left flex flex-col gap-3 ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'
            }">
              <p class="text-[8px] uppercase tracking-widest opacity-40">Whisper Thread</p>
              ${currentSecret.whispers ? `
                <div class="border-b border-white/5 pb-2">
                  <p class="text-[11px] italic break-words ${isDark ? 'text-orange-200/80' : 'text-orange-700'}">"${currentSecret.whispers}"</p>
                  <span class="text-[7px] uppercase opacity-30 mt-1 block">Original Whisper</span>
                </div>
              ` : ''}
              ${currentSecret.replies?.map((reply, i) => `
                <div class="border-b border-white/5 last:border-0 pb-2">
                  <p class="text-[11px] italic break-words ${isDark ? 'text-orange-200/80' : 'text-orange-700'}">"${reply.text || reply}"</p>
                  <span class="text-[7px] uppercase opacity-30 mt-1 block">${reply.created_at ? formatRelativeTime(reply.created_at) : 'recently'}</span>
                </div>
              `).join('') || ''}
            </div>
          ` : ''}

          <div class="flex gap-2">
            <input type="text" placeholder="Whisper a reply..." 
              class="whisper-input flex-1 border rounded-lg px-3 py-2 text-[10px] outline-none ${
                isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-zinc-600' : 'bg-gray-50 border-gray-200 placeholder:text-gray-400'
              }" />
            <button class="whisper-submit text-[8px] font-bold uppercase tracking-widest transition-colors ${
              isDark ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700'
            }">Reply</button>
          </div>
        </div>

        <div class="flex flex-col gap-4 items-center border-t pt-4 ${isDark ? 'border-white/5' : 'border-gray-200'}">
          <div class="flex justify-between items-center w-full px-4">
            <button class="nod-btn flex items-center">
              <div class="w-3 h-3 rounded-full mr-2 transition-all duration-500 ${
                hasEchoed ? 'bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : (isDark ? 'bg-zinc-600' : 'bg-gray-400')
              }"></div>
              <span class="text-[10px] tracking-widest uppercase ${hasEchoed ? 'text-purple-400' : 'text-zinc-500'}">
                ${currentSecret.nods || 0} Echoes
              </span>
            </button>
            <span class="text-[8px] uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-gray-500'}">
              ${isVisited ? "Heard" : "Unheard"}
            </span>
          </div>

          ${isMySecret ? `
            <button class="delete-btn mt-2 w-full py-2 rounded-lg text-[8px] font-bold uppercase tracking-[0.3em] transition-all opacity-40 hover:opacity-100 ${
              isDark ? 'text-red-400/50 hover:text-red-400' : 'text-red-500'
            }">Release this secret</button>
          ` : ''}
        </div>
      `;

      // Add event listeners
      const closeBtn = popupContent.querySelector('.close-btn');
      closeBtn?.addEventListener('click', () => map.closePopup());

      const olderBtn = popupContent.querySelector('.older-btn');
      olderBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        setThreadIndices(prev => ({ ...prev, [latest.id]: currentIndex + 1 }));
      });

      const newerBtn = popupContent.querySelector('.newer-btn');
      newerBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        setThreadIndices(prev => ({ ...prev, [latest.id]: currentIndex - 1 }));
      });

      const whisperSubmit = popupContent.querySelector('.whisper-submit');
      const whisperInput = popupContent.querySelector('.whisper-input');
      whisperSubmit?.addEventListener('click', () => {
        const text = whisperInput.value.trim();
        if (text) {
          onWhisper(currentSecret.id, text);
          whisperInput.value = '';
        }
      });

      const nodBtn = popupContent.querySelector('.nod-btn');
      nodBtn?.addEventListener('click', () => onNod(currentSecret.id, currentSecret.nods));

      const deleteBtn = popupContent.querySelector('.delete-btn');
      deleteBtn?.addEventListener('click', () => onDelete(currentSecret.id));

      marker.bindPopup(popupContent, { 
        maxWidth: window.innerWidth < 768 ? 260 : 350,
        closeButton: false 
      });

      marker.on('click', () => onMarkAsVisited(currentSecret.id));

      clusterGroupRef.current.addLayer(marker);
    });

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [secrets, visited, isDark, threadIndices, map]);

  return null;
}