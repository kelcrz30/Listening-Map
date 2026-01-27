import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = new Set([
    "https://sulyap.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);

  if (allowed.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const { secretId, isListening } = req.body;

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from('unspoken_words')
      .update({ is_listening: isListening })
      .eq('id', secretId);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("Toggle listening error:", e);
    return res.status(500).json({ error: "Failed to toggle listening" });
  }
}