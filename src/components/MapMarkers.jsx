import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { getMemoryIcon } from '../MapConfig';
import { formatRelativeTime } from '../utils/timeUtils';
import ListeningButton from './ListeningButton';

export default function MapMarkers({ secrets, visited, isDark, onMarkAsVisited, onNod, onWhisper, setNotification }) {
  const [whisperInput, setWhisperInput] = useState("");

  return (
    <>
      {secrets.map((s) => {
        const weight = Math.min((s.text?.length || 0) / 4 + (s.nods || 0) * 3, 40);
        
        const noddedSecrets = JSON.parse(localStorage.getItem("nodded_secrets") || "[]");
        const hasNodded = noddedSecrets.includes(s.id);

        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={getMemoryIcon(s.is_listening, visited.includes(s.id), weight, isDark)}
            eventHandlers={{ click: () => onMarkAsVisited(s.id) }}>
            
            <Popup minWidth={280}>
              <div className={`py-4 px-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                
                <span className={`text-[8px] uppercase tracking-widest mb-4 block ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                  drifted {formatRelativeTime(s.created_at)}
                </span>
                
                 <p className={`popup-text text-xl font-serif italic leading-relaxed mb-8 px-4 ${isDark ? 'text-white' : 'text-black'}`}>
                   "{s.text}"
                 </p>

                {s.whispers ? (
                  <div className={`mb-6 px-4 py-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`text-[10px] uppercase tracking-widest mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                      A Whisper Back
                    </p>
                    <p className={`text-sm font-light italic ${isDark ? 'text-orange-200/80' : 'text-orange-600'}`}>
                      "{s.whispers}"
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 flex gap-2 px-2">
                    <input
                      type="text"
                      placeholder="Whisper back..."
                      className={`flex-1 border rounded-lg px-3 py-2 text-[10px] outline-none ${
                        isDark 
                          ? 'bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-orange-500/50' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-orange-500'
                      }`}
                      value={whisperInput}
                      onChange={(e) => setWhisperInput(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        if (whisperInput.trim()) {
                          onWhisper(s.id, whisperInput);
                          setWhisperInput("");
                        }
                      }}
                      className={`text-[8px] uppercase tracking-widest transition-colors ${
                        isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-black'
                      }`}>
                      Send
                    </button>
                  </div>
                )}

                {/* Actions  */}
                <div className={`flex flex-col gap-4 items-center border-t pt-4 ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                  <button
                    onClick={() => onNod(s.id, s.nods)}
                    className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                      hasNodded 
                        ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' 
                        : (s.nods > 0 ? 'bg-orange-500/40 animate-pulse' : (isDark ? 'bg-zinc-600' : 'bg-gray-400'))
                    }`} />
                    <span className={`text-[9px] tracking-widest uppercase transition-colors ${
                      hasNodded ? 'text-orange-400' : (isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-gray-400')
                    }`}>
                      {s.nods || 0} {s.nods === 1 ? 'Nod' : 'Nods'}
                    </span>
                  </button>

                  <ListeningButton 
                    id={s.id} 
                    isListening={s.is_listening} 
                    onNod={onNod} 
                    nods={s.nods} 
                  />
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}