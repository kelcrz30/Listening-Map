// api/presence-channel.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

    // Get presence state from the channel
    const { data, error } = await supabase
      .channel('online-users')
      .track({})
      .subscribe();

    if (error) throw error;

    // Return success - actual counting happens client-side
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Presence error:', error);
    return res.status(500).json({ error: error.message });
  }
}