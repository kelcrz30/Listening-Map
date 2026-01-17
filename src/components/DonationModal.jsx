import React from 'react';

export default function DonationModal({ isOpen, onClose, isDark }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`max-w-sm w-full p-8 rounded-3xl text-center border ${
        isDark ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-black/5 text-black'
      }`}>
        
        <h2 className="text-xl font-black uppercase tracking-[0.3em] mb-4">Keep Sulyap Alive</h2>
        
        <p className={`text-[12px] md:text-[13px] opacity-70 mb-8 px-2 leading-relaxed font-serif italic`}>
          This map is a quiet space for everyone's unspoken words. 
          As the echoes grow, so do the costs of the database and hosting. 
          Your kindness helps keep the lights on and the whispers drifting.
        </p>

        {/* GCash QR Code */}
        <div className="bg-white p-3 rounded-2xl mb-8 inline-block shadow-2xl border-4 border-white transform transition-transform hover:scale-105">
          <img 
            src="/gcash-qr.jpg" 
            alt="GCash QR Code" 
            className="w-56 h-56 md:w-64 md:h-64 object-contain"
          />
        </div>

        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">
            Scan to contribute
          </p>
          
          <button 
            onClick={onClose}
            className={`w-full py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all active:scale-95 ${
              isDark 
                ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' 
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
            }`}
          >
            Return to the Map
          </button>
        </div>
      </div>
    </div>
  );
}