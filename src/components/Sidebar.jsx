import React, { useEffect, useRef } from 'react';
import { formatRelativeTime } from '../utils/timeUtils';

export default function Sidebar({ isOpen, secrets, visited, isDark, onSecretClick }) {
  const sidebarRef = useRef(null);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // Prevent wheel/touch events from reaching the map
    const preventMapScroll = (e) => {
      e.stopPropagation();
    };

    sidebar.addEventListener('wheel', preventMapScroll, { passive: false });
    sidebar.addEventListener('touchmove', preventMapScroll, { passive: false });

    return () => {
      sidebar.removeEventListener('wheel', preventMapScroll);
      sidebar.removeEventListener('touchmove', preventMapScroll);
    };
  }, []);

  return (
    <div 
      ref={sidebarRef}
      className={`fixed top-0 right-0 h-full w-full sm:max-w-sm z-[1000] backdrop-blur-3xl border-l transform transition-transform duration-1000 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } ${
        isDark 
          ? 'bg-zinc-950/90 border-white/5' 
          : 'bg-white/95 border-gray-200'
      }`}>
      <div className="p-6 sm:p-12 pt-20 sm:pt-32 h-full overflow-y-auto custom-scrollbar">
        <h2 className={`text-[9px] tracking-[0.5em] uppercase mb-10 sm:mb-16 ${isDark ? 'text-zinc-600' : 'text-gray-500'}`}>
          The Collective Archive
        </h2>
        <div className="flex flex-col gap-10 sm:gap-14">
          {secrets.map((s) => (
            <div
              key={s.id}
              onClick={() => onSecretClick(s.lat, s.lng, s.id)}
              className="group cursor-pointer">
              <div className="flex justify-between items-center mb-3">
                <p className={`text-[8px] tracking-[0.3em] uppercase ${isDark ? 'text-zinc-700' : 'text-gray-500'}`}>
                  {visited.includes(s.id) ? "✓ Visited" : "New entry"}
                </p>
                <p className={`text-[8px] italic font-light ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                  {formatRelativeTime(s.created_at)}
                </p>
              </div>
              <p className={`text-lg sm:text-xl font-serif italic leading-relaxed transition-all ${
                visited.includes(s.id) 
                  ? (isDark ? 'text-zinc-600' : 'text-gray-400') 
                  : (isDark ? 'text-zinc-400 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900')
              }`}>
                "{s.text}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}