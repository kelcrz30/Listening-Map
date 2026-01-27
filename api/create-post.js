// api/create-post.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const target =
      "https://zndkwygyxtbnlrpotgig.supabase.co/functions/v1/create-post";

    const proxyKey = process.env.EDGE_PROXY_KEY;

    if (!proxyKey) {
      console.error("❌ Missing EDGE_PROXY_KEY");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Forward auth if present
    const authHeader = req.headers.authorization || "";

    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-edge-proxy-key": proxyKey,
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("❌ Edge function error:", response.status, data);
    }

    return res.status(response.status).json(data);
  } catch (e) {
    console.error("❌ Proxy error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}
