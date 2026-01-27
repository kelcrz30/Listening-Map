import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// ✅ CORRECTED URL - check your Supabase dashboard for the exact URL
const supabase = createClient(
  'https://zndkwygyxtbnlrpotgig.supabase.co', // ← Check this matches your dashboard
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZGt3eWd5eHRibmxycG90Z2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0Nzc4NDIsImV4cCI6MjA4NDA1Mzg0Mn0.tYehNMuOHyyRABR08aCr6NImgtKnjxSDBFc3Uz07BRc'
);

const PresenceCounter = ({ isDark }) => {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const sessionId = crypto.randomUUID();

    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: sessionId,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineCount = Object.keys(state).length;
        setCount(Math.max(onlineCount, 1));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            user_id: sessionId,
          });
        }
      });

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  return (
    <div className="fixed top-6 sm:top-12 left-4 sm:left-12 z-[1000] pointer-events-none">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </div>
          
          <span className={`text-[20px] sm:text-[20px] tracking-[0.4em] sm:tracking-[0.6em] uppercase transition-colors duration-500 ${isDark ? 'text-white/50' : 'text-black'}`}>
            Sulyap
          </span>
        </div>

        <div className={`mt-2 flex items-baseline gap-2 sm:gap-4 transition-colors duration-500 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <span className="text-2xl sm:text-4xl font-serif italic">{count}</span>
          
          <span className={`text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] uppercase ${isDark ? 'text-zinc-500' : 'text-black/60'}`}>
            {count === 1 ? "Heart Listening" : "Hearts Listening"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PresenceCounter;