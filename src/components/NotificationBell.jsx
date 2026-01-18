import React, { useState, useEffect } from 'react';

export default function NotificationBell({ isDark, secrets, onNotificationClick }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [allNotifications, setAllNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkForNewReplies();
  }, [secrets]);

  const checkForNewReplies = () => {
    const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
    if (mySecrets.length === 0) {
      setAllNotifications([]);
      setUnreadCount(0);
      return;
    }

    const lastSeenCounts = JSON.parse(localStorage.getItem("last_seen_reply_counts") || "{}");
    const allUpdates = [];
    let totalUnread = 0;

    mySecrets.forEach(secretId => {
      const secret = secrets.find(s => s.id === secretId);
      if (!secret) return;

      const currentReplyCount = secret.replies?.length || 0;
      const lastSeenCount = lastSeenCounts[secretId] || 0;
      const isUnread = currentReplyCount > lastSeenCount;
      
      if (currentReplyCount > 0) {
        const newRepliesCount = Math.max(0, currentReplyCount - lastSeenCount);
        const newRepliesList = newRepliesCount > 0 ? secret.replies?.slice(-newRepliesCount) : [];
        
        allUpdates.push({
          secretId,
          secretText: secret.text,
          newReplies: newRepliesCount,
          newRepliesList,
          allReplies: secret.replies || [],
          totalReplies: currentReplyCount,
          isUnread,
          lat: secret.lat,
          lng: secret.lng,
          lastReplyAt: secret.replies[secret.replies.length - 1].created_at 
        });
        
        if (isUnread) totalUnread += newRepliesCount;
      }
    });

    const sortedUpdates = allUpdates.sort((a, b) => {
      if (a.isUnread && !b.isUnread) return -1;
      if (!a.isUnread && b.isUnread) return 1;
      return new Date(b.lastReplyAt) - new Date(a.lastReplyAt);
    });

    setAllNotifications(sortedUpdates);
    setUnreadCount(totalUnread);
  };

  const viewSecret = (update) => {
    const lastSeenCounts = JSON.parse(localStorage.getItem("last_seen_reply_counts") || "{}");
    lastSeenCounts[update.secretId] = update.totalReplies;
    localStorage.setItem("last_seen_reply_counts", JSON.stringify(lastSeenCounts));
    checkForNewReplies();
    setShowModal(false);
    if (onNotificationClick) onNotificationClick(update.lat, update.lng, update.secretId);
  };

  // REMOVED "if (allNotifications.length === 0) return null;" so the bell stays visible
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`relative p-3 sm:p-4 rounded-full backdrop-blur-xl border transition-all duration-500 hover:scale-110 active:scale-95 ${
          isDark
            ? 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            : 'bg-black/5 border-black/5 text-black/70 shadow-sm'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {unreadCount > 0 && (
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.9)]" />
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <div className={`relative max-w-lg w-full max-h-[80vh] overflow-hidden rounded-[2.5rem] border shadow-2xl ${
            isDark ? 'bg-zinc-950 border-white/5' : 'bg-white border-black/5'
          }`}>
            <div className="p-10 pb-6 flex items-start justify-between">
              <div>
                <h2 className="text-[10px] uppercase tracking-[0.6em] opacity-40 mb-3 font-bold">Shared Silence</h2>
                <p className={`text-2xl font-serif italic ${isDark ? 'text-white' : 'text-black'}`}>Someone whispered back.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white text-3xl font-light">×</button>
            </div>
            <div className="overflow-y-auto max-h-[55vh] p-10 pt-4 space-y-16">
              {allNotifications.length === 0 ? (
                <p className="text-center opacity-40 py-10">No echoes yet...</p>
              ) : (
                allNotifications.map((update) => (
                  <div key={update.secretId} className="relative group">
                    <div className={`absolute -left-6 top-0 bottom-0 w-px bg-gradient-to-b ${update.isUnread ? 'from-orange-500/80' : 'from-zinc-800'} via-transparent to-transparent`} />
                    <div className="space-y-4">
                      <p className={`text-[9px] uppercase tracking-[0.4em] font-black ${update.isUnread ? 'text-orange-500' : 'text-zinc-600'}`}>
                        {update.isUnread ? "New Echo" : "Past Connection"}
                      </p>
                      <p className={`text-sm italic font-serif leading-relaxed opacity-50 ${isDark ? 'text-white' : 'text-black'}`}>"{update.secretText}"</p>
                      <div className="space-y-6 pt-2">
                        {(update.isUnread ? update.newRepliesList : update.allReplies).map((reply, idx) => (
                          <p key={idx} className={`text-[15px] font-light leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>— {reply.text}</p>
                        ))}
                      </div>
                      <button onClick={() => viewSecret(update)} className={`mt-4 text-[9px] uppercase tracking-[0.4em] transition-all ${isDark ? 'text-white/20 hover:text-orange-400' : 'text-black/30 hover:text-orange-600'}`}>Locate heartbeat →</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}