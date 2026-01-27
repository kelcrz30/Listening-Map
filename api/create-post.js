// /api/create-post.js
export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  
  const allowed = new Set([
    "https://sulyap.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  // ✅ Set CORS headers for allowed origins
  if (allowed.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-edge-proxy-key"
  );

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ✅ Only check origin for POST requests from browsers
  if (origin && !allowed.has(origin)) {
    console.log("❌ Blocked origin:", origin);
    return res.status(403).json({ error: "Origin not allowed" });
  }

  try {
    const target =
      "https://zndkwygyxtbnlrpotgig.supabase.co/functions/v1/create-post";

    const proxyKey = process.env.EDGE_PROXY_KEY;
    if (!proxyKey) {
      console.error("❌ Missing EDGE_PROXY_KEY");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-edge-proxy-key": proxyKey,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json().catch(() => ({}));
    
    // ✅ Log errors for debugging
    if (!response.ok) {
      console.error("❌ Edge function error:", response.status, data);
    }

    return res.status(response.status).json(data);
  } catch (e) {
    console.error("❌ Proxy error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}