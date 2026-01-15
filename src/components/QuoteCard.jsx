import { motion } from 'framer-motion';

export function QuoteCard({ quote, location, onListenStart, onListenEnd, onClose }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80"
    >
      <div className="bg-zinc-900/90 border border-zinc-800 p-8 rounded-[2rem] shadow-2xl backdrop-blur-xl">
        {/* Quote Content */}
        <p className="text-xl font-light leading-relaxed text-red-900 italic mb-2">
          "{quote}"
        </p>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-8">
          Shared from {location}
        </p>

        {/* Your "I Am Listening" Button */}
        <button
          onMouseDown={onListenStart}
          onMouseUp={onListenEnd}
          onTouchStart={onListenStart}
          onTouchEnd={onListenEnd}
          className="w-full py-4 rounded-full border border-amber-500/40 text-amber-500 text-xs uppercase tracking-[0.2em] hover:bg-amber-500/10 transition-all active:scale-95"
        >
          I am listening to you
        </button>

        <button 
          onClick={onClose}
          className="mt-6 w-full text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-widest"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}