import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {


  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const channel = supabase
    .channel('realtime-posts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'unspoken_words' },
      (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    )
    .subscribe();

  req.on('close', () => {
    supabase.removeChannel(channel);
    res.end();
  });
}
