// api/get-online-count.js
const activeSessions = new Map();
const SESSION_TIMEOUT = 45000; // 45 seconds

export default async function handler(req, res) {
  const sessionId = req.headers['x-session-id'];
  const now = Date.now();
  
  // Clean up stale sessions (older than 45 seconds)
  for (const [id, timestamp] of activeSessions.entries()) {
    if (now - timestamp > SESSION_TIMEOUT) {
      activeSessions.delete(id);
    }
  }
  
  // Update this session's timestamp (only if sessionId provided)
  if (sessionId) {
    activeSessions.set(sessionId, now);
  }
  
  // Return count (minimum of 1)
  const count = Math.max(activeSessions.size, 1);
  
  return res.status(200).json({ count });
}