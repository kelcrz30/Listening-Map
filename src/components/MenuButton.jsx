import React from 'react';

export default function MenuButton({ isOpen, onClick, isDark }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 sm:p-4 rounded-full border backdrop-blur-md transition-all ${
        isDark 
          ? 'bg-white/5 hover:bg-white/10 border-white/10' 
          : 'bg-white hover:bg-gray-50 border-gray-200 shadow-lg'
      }`}>
      <div className="w-4 h-4 sm:w-5 sm:h-5 flex flex-col justify-around items-end">
        <span className={`h-px transition-all ${isDark ? 'bg-white' : 'bg-gray-700'} ${isOpen ? 'w-4 sm:w-5 rotate-45 translate-y-1.5 sm:translate-y-2' : 'w-4 sm:w-5'}`} />
        <span className={`h-px transition-all ${isDark ? 'bg-white' : 'bg-gray-700'} ${isOpen ? 'opacity-0' : 'w-2.5 sm:w-3'}`} />
        <span className={`h-px transition-all ${isDark ? 'bg-white' : 'bg-gray-700'} ${isOpen ? 'w-4 sm:w-5 -rotate-45 -translate-y-1.5 sm:-translate-y-2' : 'w-3 sm:w-4'}`} />
      </div>
    </button>
  );
}