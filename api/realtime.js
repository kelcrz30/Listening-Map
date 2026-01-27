import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // ✅ NOT service role
  );

  const channel = supabase
    .channel("realtime-posts")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "unspoken_words",
        filter: "is_visible=eq.true", // ✅ only stream visible posts
      },
      (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    )
    .subscribe();

  req.on("close", () => {
    supabase.removeChannel(channel);
    res.end();
  });
}
