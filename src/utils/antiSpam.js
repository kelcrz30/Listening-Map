// antiSpam.js - Privacy-Friendly Version

export const generateFingerprint = async () => {
  try {
    const components = [];

    // 1. Only use standard, public browser settings
    // These are things every website sees automatically
    components.push(navigator.userAgent || 'unknown');
    components.push(navigator.language || 'unknown');
    components.push(screen.width + "x" + screen.height);
    
    // 2. Use a "Session Salt" 
    // This makes the ID change if they close the browser and come back later
    // This is MUCH more private than a permanent ID
    let sessionSalt = sessionStorage.getItem('sulyap_id');
    if (!sessionSalt) {
      sessionSalt = Math.random().toString(36).substring(2);
      sessionStorage.setItem('sulyap_id', sessionSalt);
    }
    components.push(sessionSalt);

    // 3. Turn it into a random-looking string (Hash)
    // This makes the data unreadable to humans
    const fingerprint = await hashString(components.join('|'));
    
    return fingerprint;
  } catch (error) {
    return "anonymous-" + Math.random().toString(36).substring(2, 9);
  }
};

const hashString = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
};

// UX-only rate limit (No data sent to server)
export const logAction = (actionType) => {
  const key = `last_${actionType}`;
  localStorage.setItem(key, Date.now().toString());
};
export const checkRateLimitClientSide = () => ({ allowed: true });