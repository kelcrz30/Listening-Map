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
        // Echoes (nods) increase the size of the pin
        const weight = Math.min((s.text?.length || 0) / 4 + (s.nods || 0) * 3, 40); 
        
        // We use 'nodded_secrets' in localStorage but display it as 'Echoes' to the user
        const echoedSecrets = JSON.parse(localStorage.getItem("nodded_secrets") || "[]");
        const hasEchoed = echoedSecrets.includes(s.id); 
        const isVisited = visited.includes(s.id); 

        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={getMemoryIcon(s.is_listening, isVisited, weight, isDark)}
            eventHandlers={{ click: () => onMarkAsVisited(s.id) }}>
            
            <Popup minWidth={280}>
              <div className={`py-4 px-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                
                <span className={`text-[8px] uppercase tracking-widest mb-4 block ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                  drifted {formatRelativeTime(s.created_at)}
                </span>
                
                 <p className={`popup-text text-xl font-serif italic leading-relaxed mb-8 px-4 ${isDark ? 'text-white' : 'text-black'}`}>
                    "{s.text}"
                 </p>

                {/* Whisper Logic */}
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

                {/* --- UPDATED ACTIONS SECTION --- */}
                <div className={`flex flex-col gap-4 items-center border-t pt-4 ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                  
                  <div className="flex justify-between items-center w-full px-4">
                    {/* The Echo Button (Formerly Nod) */}
                    <button
                      onClick={() => onNod(s.id, s.nods)}
                      className="group flex items-center gap-2 transition-transform active:scale-95"
                    >
                      <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                        hasEchoed 
                          ? 'bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' 
                          : (isDark ? 'bg-zinc-600' : 'bg-gray-400')
                      }`} />
                      <span className={`text-[10px] tracking-widest uppercase ${
                        hasEchoed ? 'text-purple-400 font-bold' : (isDark ? 'text-zinc-500' : 'text-gray-400')
                      }`}>
                        {s.nods || 0} {s.nods === 1 ? 'Echo' : 'Echoes'}
                      </span>
                    </button>
                    
                    <span className={`text-[8px] uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
                      {isVisited ? "Heard" : "Unheard"}
                    </span>
                  </div>

                  {/* The Live Pulse Button */}
                  <ListeningButton 
                    id={s.id} 
                    isListening={s.is_listening} 
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