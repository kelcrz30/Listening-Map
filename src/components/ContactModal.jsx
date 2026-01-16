import React, { useState } from 'react';
import emailjs from '@emailjs/browser';

export default function ContactModal({ onClose, setNotification }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    suggestion: ""
  });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = (e) => {
    if (!formData.suggestion.trim() || isSending) return;
    
    setIsSending(true);

    const serviceID = 'service_xairuls';
    const templateID = 'template_gpb20um';
    const publicKey = '_PgJTtfnv1KDPxJ9k';

    // These keys MUST match the {{variable}} names in your EmailJS template
    const templateParams = {
      name: formData.name || "Anonymous",
      email: formData.email || "No email provided",
      message: formData.suggestion,
    };

    emailjs.send(serviceID, templateID, templateParams, publicKey)
      .then(() => {
        setNotification("Whisper sent to the dev.");
        onClose();
      })
      .catch((err) => {
        setNotification("The void is full. Try again.");
        console.error('EmailJS Error:', err);
      })
      .finally(() => setIsSending(false));
  };

  return (
    <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/95 px-4 overflow-y-auto">
      <div className="max-w-xl w-full my-8">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-zinc-700 text-[10px] tracking-[0.8em] uppercase">
            Whisper to the Dev
          </h2>
          <button onClick={onClose} className="text-zinc-700 hover:text-white transition-colors">
            [ Close ]
          </button>
        </div>

        <div className="space-y-6">
          {/* Identity Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <input 
              type="text"
              placeholder="YOUR NAME (OPTIONAL)"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="bg-transparent border-b border-zinc-800 focus:border-white/40 py-3 text-white text-[10px] tracking-widest outline-none transition-all placeholder:text-zinc-800 uppercase"
            />
            <input 
              type="email"
              placeholder="GMAIL (FOR REPLIES)"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="bg-transparent border-b border-zinc-800 focus:border-white/40 py-3 text-white text-[10px] tracking-widest outline-none transition-all placeholder:text-zinc-800 uppercase"
            />
          </div>

          {/* Message Area */}
          <textarea
            value={formData.suggestion}
            onChange={(e) => setFormData({...formData, suggestion: e.target.value})}
            placeholder="How can we make this silence better?"
            className="w-full h-48 bg-transparent border-l border-zinc-800 focus:border-white/40 p-8 text-white text-lg font-serif italic outline-none transition-all resize-none placeholder:text-zinc-800"
          />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
          <button 
            onClick={handleSubmit} 
            disabled={isSending}
            className={`group flex items-center gap-6 ${isSending ? 'opacity-50' : 'opacity-100'}`}
          >
            <span className="text-zinc-500 group-hover:text-white text-[10px] tracking-[0.5em] uppercase transition-all">
              {isSending ? 'Sending...' : 'Send Message'}
            </span>
            <div className="w-12 h-[1px] bg-zinc-800 group-hover:w-20 group-hover:bg-white transition-all duration-500" />
          </button>

          <div className="flex gap-6 items-center">
            <a href="https://www.facebook.com/kelllllll/" target="_blank" rel="noreferrer" className="text-zinc-700 hover:text-white text-[9px] tracking-[0.3em] uppercase transition-colors">Facebook</a>
            <span className="text-zinc-900">/</span>
            <a href="https://www.tiktok.com/@nykelcrz" target="_blank" rel="noreferrer" className="text-zinc-700 hover:text-white text-[9px] tracking-[0.3em] uppercase transition-colors">TikTok</a>
          </div>
        </div>
      </div>
    </div>
  );
}