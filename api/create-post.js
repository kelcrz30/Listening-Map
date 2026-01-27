// /api/create-post.js
export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || "";
  const allowed = new Set([
    "https://sulyap.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

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
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // ✅ Debug HERE (after method checks)
  console.log("EDGE_PROXY_KEY exists?", !!process.env.EDGE_PROXY_KEY);

  try {
    const target =
      "https://zndkwygyxtbnlrpotgig.supabase.co/functions/v1/create-post";

    const proxyKey = process.env.EDGE_PROXY_KEY;
    if (!proxyKey) {
      return res.status(500).json({ error: "Missing EDGE_PROXY_KEY on Vercel" });
    }

    const r = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-edge-proxy-key": proxyKey,
      },
      body: JSON.stringify(req.body),
    });

    const data = await r.json().catch(() => ({}));
    return res.status(r.status).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Proxy error" });
  }
}
