import React, { useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Ensure this path is correct

export default function ListeningButton({ id, isListening }) {
  
  // AUTO-OFF TIMER: Turns off the orange pulse after 5 minutes
  useEffect(() => {
    let timer;
    if (isListening) {
      timer = setTimeout(() => {
        stopListening();
      }, 5 * 60 * 1000); // 5 minutes in milliseconds
    }
    return () => clearTimeout(timer); // Cleanup timer if user clicks button manually
  }, [isListening]);

  const stopListening = async () => {
    await supabase
      .from('unspoken_words')
      .update({ is_listening: false })
      .eq('id', id);
  };

  const toggleListen = async () => {
    const { error } = await supabase
      .from('unspoken_words')
      .update({ is_listening: !isListening })
      .eq('id', id);

    if (error) console.error("Sync error:", error);
  };

  return (
    <button 
      onClick={toggleListen}
      className={`w-full py-3 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all duration-500 ${
        isListening 
          ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse' 
          : 'bg-white/5 text-zinc-500 border border-white/10 hover:bg-white/10'
      }`}
    >
      {isListening ? "❤ You are listening" : "Listen to this heart"}
    </button>
  );
}