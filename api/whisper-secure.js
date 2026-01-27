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
    const { postId, whisperText, turnstileToken, fingerprint } = req.body;

    const response = await fetch(
      `https://zndkwygyxtbnlrpotgig.supabase.co/functions/v1/whisper-secure`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ postId, whisperText, turnstileToken, fingerprint })
      }
    );

    const result = await response.json();
    return res.status(response.status).json(result);
  } catch (e) {
    console.error("Whisper error:", e);
    return res.status(500).json({ error: "Failed to send whisper" });
  }
}