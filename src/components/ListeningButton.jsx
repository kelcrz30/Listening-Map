import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ListeningButton({ id }) {
  const [isCurrentlyListening, setIsCurrentlyListening] = useState(false);

  // Check LocalStorage to see if THIS user is already one of the listeners
  useEffect(() => {
    const myListeners = JSON.parse(localStorage.getItem('my_active_listens') || '[]');
    setIsCurrentlyListening(myListeners.includes(id));
  }, [id]);

  const toggleListen = async () => {
    const myListeners = JSON.parse(localStorage.getItem('my_active_listens') || '[]');
    let newList;
    let incrementValue;

    if (isCurrentlyListening) {
      // 1. User wants to STOP
      newList = myListeners.filter(itemId => itemId !== id);
      incrementValue = -1;
    } else {
      // 2. User wants to START
      newList = [...myListeners, id];
      incrementValue = 1;

      // Auto-off timer (5 mins)
      setTimeout(() => {
        const checkStillActive = JSON.parse(localStorage.getItem('my_active_listens') || '[]');
        if (checkStillActive.includes(id)) toggleListen();
      }, 5 * 60 * 1000);
    }

    // UPDATE DATABASE (Global)
    // We fetch current count first to calculate new state
    const { data } = await supabase
      .from('unspoken_words')
      .select('listener_count')
      .eq('id', id)
      .single();

    const newCount = Math.max(0, (data?.listener_count || 0) + incrementValue);

    await supabase
      .from('unspoken_words')
      .update({ 
        listener_count: newCount,
        is_listening: newCount > 0 // Pulse globally if at least 1 person is listening
      })
      .eq('id', id);

    // UPDATE LOCAL STATE (Device specific)
    localStorage.setItem('my_active_listens', JSON.stringify(newList));
    setIsCurrentlyListening(!isCurrentlyListening);
  };

  return (
    <button 
      onClick={toggleListen}
      className={`w-full py-3 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all duration-500 ${
        isCurrentlyListening 
          ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse' 
          : 'bg-white/5 text-zinc-500 border border-white/10 hover:bg-white/10'
      }`}
    >
      {isCurrentlyListening ? "❤ You are listening" : "Listen to this heart"}
    </button>
  );
}