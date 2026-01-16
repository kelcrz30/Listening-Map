import React from 'react';

export default function LocationModeToggle({ useCurrentLocation, onToggle, isDark }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
      isDark 
        ? 'bg-zinc-900/80 border-white/10' 
        : 'bg-white/90 border-gray-200 shadow-lg'
    }`}>
      <button
        onClick={() => onToggle(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[8px] tracking-widest uppercase transition-all ${
          useCurrentLocation
            ? 'bg-orange-500 text-white shadow-md'
            : (isDark ? 'text-zinc-500 hover:text-white' : 'text-gray-500 hover:text-gray-900')
        }`}>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>GPS</span>
      </button>
      
      <button
        onClick={() => onToggle(false)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[8px] tracking-widest uppercase transition-all ${
          !useCurrentLocation
            ? 'bg-orange-500 text-white shadow-md'
            : (isDark ? 'text-zinc-500 hover:text-white' : 'text-gray-500 hover:text-gray-900')
        }`}>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span>Pick/Search</span>
      </button>
    </div>
  );
}