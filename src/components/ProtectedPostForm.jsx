import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { generateFingerprint, checkRateLimit, logAction } from '../utils/antiSpam';

export default function ProtectedPostForm({ isDark, onPostSuccess }) {
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState('');
  
  // --- NEW: Cooldown State ---
  const [cooldown, setCooldown] = useState(0);

  // --- NEW: Timer Effect ---
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsPosting(true);

    try {
      // 1. Honeypot check
      const honeypot = e.target.website?.value;
      if (honeypot) {
        setError('Invalid submission');
        setIsPosting(false);
        return;
      }

      // 2. Generate Fingerprint
      const fingerprint = await generateFingerprint();

      // 3. Check Rate Limit (The "Minutes Remaining" Logic)
      const rateCheck = await checkRateLimit(supabase, fingerprint, 'post');
      if (!rateCheck.allowed) {
        // This shows the error if they hit the 20-per-hour limit
        setError(`Limit reached. ${rateCheck.reason}`);
        setIsPosting(false);
        return;
      }

      // 4. Get Location
      const location = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null)
        );
      });

      if (!location) {
        setError('Location required to post');
        setIsPosting(false);
        return;
      }

      // 5. Insert to DB
      const { data, error: postError } = await supabase
        .from('unspoken_words')
        .insert({
          text: text.trim(),
          lat: location.lat,
          lng: location.lng,
          is_listening: false,
          nods: 0
        })
        .select()
        .single();

      if (postError) throw postError;

      // 6. Log the action
      await logAction(supabase, fingerprint, 'post', navigator.userAgent);

      // --- NEW: Start 10 second cooldown after success ---
      setCooldown(10); 
      
      setText('');
      if (onPostSuccess) onPostSuccess(data);
      
    } catch (err) {
      console.error(err);
      setError('Failed to post. Try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative p-4">
      {/* Hidden bot trap */}
      <input type="text" name="website" tabIndex="-1" className="hidden opacity-0 absolute" autoComplete="off" />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share something unspoken..."
        maxLength={500}
        disabled={isPosting || cooldown > 0}
        className={`w-full p-3 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}
      />

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      <button 
        type="submit" 
        // Button is disabled during posting OR during the 10s cooldown
        disabled={!text.trim() || isPosting || cooldown > 0} 
        className={`mt-2 px-6 py-2 rounded-full font-bold transition-all ${
          cooldown > 0 ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {isPosting ? 'POSTING...' : cooldown > 0 ? `WAIT ${cooldown}s` : 'POST'}
      </button>
    </form>
  );
}