import { supabase } from "../supabaseClient";

export default function ListeningButton({ id, isListening }) {
  const toggleListen = async () => {
    // This updates the database instantly
    const { error } = await supabase
      .from('unspoken_words')
      .update({ is_listening: !isListening })
      .eq('id', id);

    if (error) console.error("Error:", error);
  };

  return (
    <button 
      onClick={toggleListen}
      className={`w-full py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${
        isListening 
          ? 'bg-orange-500 text-white shadow-lg' 
          : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
      }`}
    >
      {isListening ? "I AM LISTENING" : "LISTEN TO THIS"}
    </button>
  );
}