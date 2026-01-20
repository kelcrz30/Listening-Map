// antiSpam.js

export const generateFingerprint = async () => {
  const components = [];
  components.push(screen.width, screen.height, screen.colorDepth, window.devicePixelRatio);
  components.push(new Date().getTimezoneOffset());
  components.push(navigator.language, navigator.platform);
  components.push(navigator.hardwareConcurrency || 0);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('sulyap', 2, 2);
  components.push(canvas.toDataURL());

  const gl = canvas.getContext('webgl');
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
      components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
    }
  }

  const fingerprint = await hashString(components.join('|||'));
  return fingerprint;
};

const hashString = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// REPLACE YOUR checkRateLimit WITH THIS:
export const checkRateLimit = async (supabase, fingerprint, actionType) => {
  const limits = {
    post: { maxActions: 20, windowMinutes: 60 },
    whisper: { maxActions: 30, windowMinutes: 60 },
    nod: { maxActions: 100, windowMinutes: 60 }
  };

  const limit = limits[actionType];
  if (!limit) return { allowed: true };

  const windowStart = new Date(Date.now() - limit.windowMinutes * 60 * 1000).toISOString();

  const { data: recentActions, error } = await supabase
    .from('rate_limits')
    .select('id, created_at')
    .eq('fingerprint', fingerprint)
    .eq('action_type', actionType)
    .gte('created_at', windowStart);

  if (error) return { allowed: true };

  const actionCount = recentActions?.length || 0;

  if (actionCount >= limit.maxActions) {
    const oldestAction = recentActions.sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    )[0];
    
    const resetTime = new Date(new Date(oldestAction.created_at).getTime() + limit.windowMinutes * 60 * 1000);
    const minutesRemaining = Math.ceil((resetTime - new Date()) / 60000);
    
    return {
      allowed: false,
      reason: `Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
    };
  }
  
  return { allowed: true, remaining: limit.maxActions - actionCount };
};

export const logAction = async (supabase, fingerprint, actionType, userAgent) => {
  await supabase.from('rate_limits').insert({
    fingerprint,
    action_type: actionType,
    user_agent: userAgent
  });
};