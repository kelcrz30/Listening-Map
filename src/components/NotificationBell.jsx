import React, { useState, useEffect } from 'react';

export default function NotificationBell({ isDark, secrets, onNotificationClick }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [allNotifications, setAllNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Sync notifications whenever the secrets list changes
  useEffect(() => {

    checkForNewReplies();
  }, [secrets]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [showModal]);

const checkForNewReplies = () => {
  // Get IDs of secrets you POSTED
  const mySecrets = JSON.parse(localStorage.getItem("my_secrets") || "[]");
  // Get IDs of secrets you REPLIED to
  const commentedSecrets = JSON.parse(localStorage.getItem("commented_secrets") || "[]");
  

  
  // Combine them into one unique list of "Watched" IDs
  const watchedIds = [...new Set([...mySecrets, ...commentedSecrets])];
  

  if (watchedIds.length === 0) {

    setAllNotifications([]);
    setUnreadCount(0);
    return;
  }

  const lastSeenCounts = JSON.parse(localStorage.getItem("last_seen_reply_counts") || "{}");

  
  const allUpdates = [];
  let unreadSecretCount = 0;

  watchedIds.forEach(secretId => {
    const secret = secrets.find(s => s.id === secretId);
    
    
    if (!secret) {
      return;
    }
    
    // Handle both array and empty array cases
    const replies = Array.isArray(secret.replies) ? secret.replies : [];
    const currentReplyCount = replies.length;
    

    if (currentReplyCount === 0) {
      return;
    }

    // ✅ FIX: For YOUR posts, initialize lastSeen to 0 if not set
    // For posts you commented on, initialize to current count
    const isMyPost = mySecrets.includes(secretId);
    let lastSeenCount = lastSeenCounts[secretId];
    
    if (lastSeenCount === undefined) {
      // First time checking this secret
      if (isMyPost) {
        // For your posts, start at 0 so you see all replies as new
        lastSeenCount = 0;
      } else {
        // For posts you commented on, mark current count as seen
        // (you already know about replies up to when you commented)
        lastSeenCount = currentReplyCount;
        lastSeenCounts[secretId] = currentReplyCount;
        localStorage.setItem("last_seen_reply_counts", JSON.stringify(lastSeenCounts));
      }
    }
    
    const isUnread = currentReplyCount > lastSeenCount;
    
    
    // Label based on whether you own the post or just joined the thread
    const notificationType = isMyPost ? "Your Post" : "Joined Thread";

    allUpdates.push({
      secretId,
      secretText: secret.text,
      totalReplies: currentReplyCount,
      latestReplies: replies.slice(-3),
      isUnread,
      lat: secret.lat,
      lng: secret.lng,
      notificationType, 
      lastReplyAt: replies[replies.length - 1].created_at 
    });
    
    if (isUnread) unreadSecretCount++;
  });



  // Sort: Unread first, then by most recent date
  const sortedUpdates = allUpdates.sort((a, b) => {
    if (a.isUnread && !b.isUnread) return -1;
    if (!a.isUnread && b.isUnread) return 1;
    return new Date(b.lastReplyAt) - new Date(a.lastReplyAt);
  });

  setAllNotifications(sortedUpdates);
  setUnreadCount(unreadSecretCount);
};

  const viewSecret = (update) => {
    const lastSeenCounts = JSON.parse(localStorage.getItem("last_seen_reply_counts") || "{}");
    lastSeenCounts[update.secretId] = update.totalReplies;
    localStorage.setItem("last_seen_reply_counts", JSON.stringify(lastSeenCounts));
    
    checkForNewReplies();
    
    setTimeout(() => {
      setShowModal(false);
      if (onNotificationClick) {
        onNotificationClick(update.lat, update.lng, update.secretId);
      }
    }, 150);
  };

  return (
    <>
      {/* Bell Button */}
      <button
        onClick={() => setShowModal(true)}
        className={`relative p-3 sm:p-4 rounded-full backdrop-blur-xl border transition-all duration-500 hover:scale-110 active:scale-95 z-[1001] ${
          isDark
            ? 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            : 'bg-white/80 border-black/5 text-black/50 hover:text-black shadow-sm'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {unreadCount > 0 && (
          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.9)]" />
        )}
      </button>

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md transition-all">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/80" onClick={() => setShowModal(false)} />
          
          <div className={`relative max-w-lg w-full max-h-[85vh] overflow-hidden rounded-[2.5rem] border shadow-2xl transition-all flex flex-col ${
            isDark 
              ? 'bg-zinc-950 border-white/5 shadow-black' 
              : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50'
          }`}>
            
            {/* Header */}
            <div className="p-8 sm:p-10 pb-4 flex items-start justify-between">
              <div>
                <h2 className={`text-[9px] uppercase tracking-[0.6em] mb-2 font-bold opacity-40 ${isDark ? 'text-white' : 'text-black'}`}>
                  Echoes of Silence
                </h2>
                <p className={`text-2xl font-serif italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Voices in the wind.
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className={`text-3xl font-light transition-colors p-2 -mr-2 ${isDark ? 'text-zinc-500 hover:text-white' : 'text-gray-300 hover:text-gray-900'}`}
              >
                ×
              </button>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1 p-8 sm:p-10 pt-4 space-y-12 custom-scrollbar pb-12">
              {allNotifications.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <p className={`text-sm italic opacity-30 ${isDark ? 'text-white' : 'text-black'}`}>
                    No one has whispered back yet...
                  </p>
                </div>
              ) : (
                allNotifications.map((update) => (
                  <div key={update.secretId} className="relative">
                    <div className={`absolute -left-6 top-1 bottom-1 w-0.5 rounded-full transition-colors ${
                      update.isUnread ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : (isDark ? 'bg-zinc-800' : 'bg-gray-100')
                    }`} />
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-[8px] uppercase tracking-[0.4em] font-black ${
                          update.isUnread ? 'text-orange-500' : (isDark ? 'text-zinc-600' : 'text-gray-400')
                        }`}>
                          {update.notificationType === "Your Post" ? "Your Post" : "Joined Thread"} 
                          {update.isUnread ? " • New Echo" : " • Read Echo"}
                        </span>
                        
                        {update.isUnread && (
                           <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />
                        )}
                      </div>
                      
                      <p className={`text-xs italic font-serif leading-relaxed line-clamp-2 ${
                        isDark ? 'text-white/40' : 'text-black/40'
                      }`}>
                        "{update.secretText}"
                      </p>
                      
                      <div className="space-y-4 pt-1">
                        {update.latestReplies.map((reply, idx) => (
                          <div key={idx} className="flex gap-3">
                            <span className="opacity-20 text-xs">―</span>
                            <p className={`text-[14px] font-light leading-relaxed ${
                              isDark ? 'text-zinc-300' : 'text-gray-700'
                            }`}>
                              {reply.text}
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      <button 
                        onClick={() => viewSecret(update)} 
                        className={`mt-4 inline-flex items-center text-[9px] uppercase tracking-[0.4em] transition-all font-bold py-2 px-3 -ml-3 rounded-lg ${
                          isDark 
                            ? 'text-white/30 hover:text-orange-400 hover:bg-white/5' 
                            : 'text-black/40 hover:text-orange-600 hover:bg-black/5'
                        }`}
                      >
                        Locate Heartbeat 
                        <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </button>
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