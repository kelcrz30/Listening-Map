import React, { useState, useEffect } from 'react';

const ListeningButton = ({ id, onToggle, isDark }) => {
  const [isListening, setIsListening] = useState(false);

  // 1. Run the check inside useEffect so it doesn't happen DURING render
  useEffect(() => {
    const saved = localStorage.getItem('listening_secrets') || '[]';
    const listeningList = JSON.parse(saved);
    const currentlyListening = listeningList.includes(id);
    
    setIsListening(currentlyListening);
    
    // Only notify the parent if they are actually listening
    if (currentlyListening) {
      onToggle(true);
    }
  }, [id]); // This ensures it runs safely after the button mounts

  const handleToggle = () => {
    const saved = localStorage.getItem('listening_secrets') || '[]';
    let listeningList = JSON.parse(saved);
    let newState;

    if (isListening) {
      listeningList = listeningList.filter(item => item !== id);
      newState = false;
    } else {
      listeningList.push(id);
      newState = true;
    }

    localStorage.setItem('listening_secrets', JSON.stringify(listeningList));
    setIsListening(newState);
    onToggle(newState); // Parent update is safe here because it's an event
  };

  return (
    <button
      onClick={handleToggle}
      className={`w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
        isListening 
          ? 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]' 
          : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {isListening ? "🧡 You are Listening" : "👂 Listen to this Heart"}
    </button>
  );
};

export default ListeningButton;