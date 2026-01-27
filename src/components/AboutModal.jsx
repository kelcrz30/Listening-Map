import React, { useEffect } from 'react';

export default function AboutModal({ onClose }) {
  // Close on Escape key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/90 backdrop-blur-2xl px-4 py-8"
      onClick={onClose}
    >
      <div 
        className="max-w-lg w-full max-h-[90vh] bg-zinc-950/80 border border-white/10 rounded-3xl relative overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 text-zinc-500 hover:text-white text-2xl transition-colors"
          aria-label="Close modal"
        >
          &times;
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-12 pr-16">
          <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-6">
            The Philosophy
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-10">
            "I built this map to visualize the weight of the things we keep inside. 
            Every dot is a breath, every nod is an echo."
            <br /><br />
            Sulyap is a digital sanctuary for the unspoken. It is a collective constellation 
            of secrets, shared anonymously from every corner of the world.
          </p>

          <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-4">
            Privacy & What We Collect
          </h2>
          <ul className="text-zinc-500 text-[11px] leading-relaxed space-y-3 mb-8">
            <li>
              <span className="text-zinc-300">ANONYMOUS ACCOUNTS:</span> You sign in anonymously through Supabase. 
              No email, no password, no personal information required. Each session gets a random user ID.
            </li>
            <li>
              <span className="text-zinc-300">YOUR WORDS & LOCATION:</span> When you share a secret, we store your message, 
              GPS coordinates (or manually selected location), and timestamp. This allows you to see your posts on the map.
            </li>
            <li>
              <span className="text-zinc-300">OPTIONAL PIN:</span> If you set a 4-digit PIN, you can delete your post later. 
              Without a PIN, your words become permanent—like releasing them into the wind.
            </li>
            <li>
              <span className="text-zinc-300">SPAM PREVENTION:</span> To keep the space safe, we collect:
              <ul className="ml-4 mt-2 space-y-1">
                <li>• Browser fingerprint (hashed, not traceable to you)</li>
                <li>• IP address (hashed, stored for rate limiting)</li>
                <li>• Network subnet (hashed, for distributed spam detection)</li>
                <li>• Typing patterns (to detect bots)</li>
                <li>• Cloudflare security verification</li>
              </ul>
            </li>
            <li>
              <span className="text-zinc-300">SECURITY HASHING:</span> Your IP and device fingerprint are cryptographically 
              hashed with a secret salt—meaning we can verify rate limits and prevent spam, but we cannot reverse-engineer who you are.
            </li>
            <li>
              <span className="text-zinc-300">OWNERSHIP:</span> Each post is tied to your anonymous user ID. You can only 
              delete, hide, or modify your own posts—not others'.
            </li>
            <li>
              <span className="text-zinc-300">NO TRACKING:</span> We don't use analytics, cookies, or tracking pixels. 
              We don't sell your data. We don't know who you are.
            </li>
            <li>
              <span className="text-zinc-300">MODERATION:</span> Posts are scanned for spam, URLs, and harmful content. 
              Flagged posts are shadow-banned (hidden from the public map) but remain visible to you.
            </li>
          </ul>

          <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-4">
            Rate Limits (To Prevent Abuse)
          </h2>
          <ul className="text-zinc-500 text-[11px] leading-relaxed space-y-2 mb-8">
            <li>• 2 minutes between posts</li>
            <li>• 5 posts per 5 minutes</li>
            <li>• 25 posts per hour</li>
            <li>• 30 posts per day</li>
            <li>• 10 second cooldown per network</li>
            <li>• 50 posts per minute globally (all users)</li>
          </ul>

          <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-4">
            Data Storage
          </h2>
          <ul className="text-zinc-500 text-[11px] leading-relaxed space-y-2 mb-8">
            <li>
              <span className="text-zinc-300">POSTS:</span> Stored indefinitely unless you delete them with your PIN. 
              Posts without PINs are permanent.
            </li>
            <li>
              <span className="text-zinc-300">RATE LIMIT DATA:</span> Stored in database tables (rate_limits, global_limits) 
              to enforce posting limits. Not automatically deleted.
            </li>
            <li>
              <span className="text-zinc-300">HASHED IDENTIFIERS:</span> IP hash, subnet hash, and fingerprint are stored 
              with each post for spam prevention and rate limiting. These cannot be reversed to identify you.
            </li>
            <li>
              <span className="text-zinc-300">CONTENT HASHES:</span> We store a hash of your post content to prevent 
              duplicate submissions within 24 hours.
            </li>
          </ul>

          <h2 className="text-zinc-600 text-[9px] tracking-[0.5em] uppercase mb-4">
            Your Rights
          </h2>
          <ul className="text-zinc-500 text-[11px] leading-relaxed space-y-2 mb-8">
            <li>• Delete your posts anytime (if you set a PIN)</li>
            <li>• Hide posts from the public map</li>
            <li>• Control whether you receive replies ("listening" mode)</li>
            <li>• No account to delete—just close your browser</li>
            <li>• All posts are tied to anonymous IDs, not your identity</li>
          </ul>

          <div className="pt-6 border-t border-white/5">
            <p className="text-zinc-600 text-[10px] italic">
              Sulyap is built with care, not surveillance. Your secrets are yours alone.
            </p>
            <p className="text-zinc-600 text-[10px] italic mt-2">- Kel</p>
          </div>

          <button
            onClick={onClose}
            className="mt-8 text-zinc-400 hover:text-white text-[9px] uppercase tracking-widest border border-white/10 px-6 py-3 rounded-full hover:bg-white/5 transition-all"
          >
            Return to the Map
          </button>
        </div>
      </div>
    </div>
  );
}