// api/rapid-responder.js

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { postId, pin } = req.body;

    const proxyKey = process.env.EDGE_PROXY_KEY;

    if (!proxyKey) {
      console.error("❌ Missing EDGE_PROXY_KEY");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // ✅ CRITICAL FIX: Forward the user's auth token, not SERVICE_ROLE
    const authHeader = req.headers.authorization || "";

    if (!authHeader) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const response = await fetch(
      `https://zndkwygyxtbnlrpotgig.supabase.co/functions/v1/rapid-responder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-edge-proxy-key': proxyKey,
          'Authorization': authHeader, // ✅ Forward user's token, not SERVICE_ROLE
        },
        body: JSON.stringify({ postId, pin })
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      console.error("❌ Edge function error:", response.status, result);
    }

    return res.status(response.status).json(result);
  } catch (e) {
    console.error("❌ Delete proxy error:", e);
    return res.status(500).json({ error: "Failed to delete" });
  }
}