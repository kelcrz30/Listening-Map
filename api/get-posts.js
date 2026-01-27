import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = new Set([
    "https://sulyap.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
        "http://localhost:3000",  // ✅ ADD THIS
    "http://127.0.0.1:3000",  // ✅ ADD THIS
    
  ]);

  if (allowed.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from("unspoken_words")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    return res.status(200).json({ data });
  } catch (e) {
    console.error("Get posts error:", e);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
}