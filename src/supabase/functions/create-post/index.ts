import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Configuration
const MAX_TEXT_LENGTH = 500
const MIN_TEXT_LENGTH = 3
const MAX_POSTS_PER_HOUR = 3
const MAX_POSTS_PER_HOUR_PER_IP = 5
const MIN_POST_INTERVAL_SECONDS = 120 // 2 minutes between posts
const MAX_DISTANCE_KM = 50 // Max km user can "move" in 15 minutes

interface PostRequest {
  text: string
  lat: number
  lng: number
  post_pin?: string
  turnstileToken: string
  fingerprint: string
}

// Content validation
function validateContent(text: string): { valid: boolean; reason?: string } {
  const trimmed = text.trim()
  
  if (trimmed.length < MIN_TEXT_LENGTH) {
    return { valid: false, reason: 'Post too short (minimum 3 characters)' }
  }
  
  if (trimmed.length > MAX_TEXT_LENGTH) {
    return { valid: false, reason: 'Post too long (maximum 500 characters)' }
  }
  
  // Spam patterns
  const spamPatterns = [
    { pattern: /(.)\1{10,}/i, reason: 'Repeated characters detected' },
    { pattern: /[^\w\s]{15,}/, reason: 'Too many special characters' },
    { pattern: /\b(viagra|cialis|casino|lottery)\b/gi, reason: 'Spam keywords detected' },
  ]
  
  for (const { pattern, reason } of spamPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason }
    }
  }
  
  // Check character diversity
  const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s/g, '')).size
  if (uniqueChars < 5 && trimmed.length > 20) {
    return { valid: false, reason: 'Content lacks diversity' }
  }
  
  return { valid: true }
}

// Coordinate validation
function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

// Calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, lat, lng, post_pin, turnstileToken, fingerprint }: PostRequest = await req.json()
    
    // Get client IP
    const clientIP = req.headers.get('x-real-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     'unknown'
    
    const userAgent = req.headers.get('user-agent') || 'unknown'
    
    // Basic validation
    if (!text || !lat || !lng || !turnstileToken || !fingerprint) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate coordinates
    if (!validateCoordinates(lat, lng)) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate content
    const contentCheck = validateContent(text)
    if (!contentCheck.valid) {
      return new Response(
        JSON.stringify({ error: contentCheck.reason }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. CHECK SYSTEM STATUS (Kill switch)
    const { data: systemStatus } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'posting_enabled')
      .maybeSingle()
    
    if (systemStatus && !systemStatus.value) {
      return new Response(
        JSON.stringify({ error: 'Posting temporarily disabled. Please try again later.' }), 
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. BLACKLIST CHECK
    const { data: isBlocked } = await supabase
      .from('blacklisted_ips')
      .select('ip')
      .eq('ip', clientIP)
      .maybeSingle()

    if (isBlocked) {
      console.log(`Blocked IP attempted post: ${clientIP}`)
      return new Response(
        JSON.stringify({ error: 'Access denied' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. VERIFY CAPTCHA
    const turnstileResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: TURNSTILE_SECRET,
          response: turnstileToken,
          remoteip: clientIP
        })
      }
    )

    const turnstileResult = await turnstileResponse.json()
    if (!turnstileResult.success) {
      console.log(`Captcha failed for IP: ${clientIP}, fingerprint: ${fingerprint}`)
      return new Response(
        JSON.stringify({ error: 'Please complete the security verification' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. RATE LIMIT CHECKS
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const twoMinutesAgo = new Date(Date.now() - MIN_POST_INTERVAL_SECONDS * 1000).toISOString()
    
    // Check fingerprint rate limit
    const { data: recentPostsByFingerprint } = await supabase
      .from('rate_limits')
      .select('id, created_at')
      .eq('fingerprint', fingerprint)
      .eq('action_type', 'post')
      .gte('created_at', oneHourAgo)

    if (recentPostsByFingerprint && recentPostsByFingerprint.length >= MAX_POSTS_PER_HOUR) {
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. Maximum ${MAX_POSTS_PER_HOUR} posts per hour.`,
          retryAfter: 3600 
        }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check IP rate limit
    const { data: recentPostsByIP } = await supabase
      .from('rate_limits')
      .select('id')
      .eq('ip_address', clientIP)
      .eq('action_type', 'post')
      .gte('created_at', oneHourAgo)

    if (recentPostsByIP && recentPostsByIP.length >= MAX_POSTS_PER_HOUR_PER_IP) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many posts from your network. Please wait.',
          retryAfter: 3600 
        }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check minimum interval between posts
    const { data: veryRecentPost } = await supabase
      .from('rate_limits')
      .select('created_at')
      .eq('fingerprint', fingerprint)
      .eq('action_type', 'post')
      .gte('created_at', twoMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (veryRecentPost) {
      return new Response(
        JSON.stringify({ 
          error: 'Please wait 2 minutes between posts',
          retryAfter: 120
        }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. DUPLICATE DETECTION
    const oneHourAgoForDupes = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: duplicates } = await supabase
      .from('unspoken_words')
      .select('id')
      .eq('text', text.trim())
      .gte('created_at', oneHourAgoForDupes)
      .limit(1)

    if (duplicates && duplicates.length > 0) {
      return new Response(
        JSON.stringify({ error: 'This exact post was recently submitted' }), 
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. GEOGRAPHIC VALIDATION (Check for teleporting)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: recentLocation } = await supabase
      .from('unspoken_words')
      .select('lat, lng, created_at')
      .eq('user_ip', clientIP)
      .gte('created_at', fifteenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentLocation) {
      const distance = calculateDistance(lat, lng, recentLocation.lat, recentLocation.lng)
      if (distance > MAX_DISTANCE_KM) {
        console.log(`Suspicious location jump: ${distance}km for IP ${clientIP}`)
        // Flag but don't block - might be VPN/proxy change
      }
    }

    // 7. CHECK USER HISTORY FOR AUTO-MODERATION
    const { data: userHistory } = await supabase
      .from('unspoken_words')
      .select('id, is_flagged, created_at')
      .eq('user_ip', clientIP)
      .order('created_at', { ascending: false })
      .limit(10)

    const isNewUser = !userHistory || userHistory.length < 3
    const hasBeenFlagged = userHistory?.some(post => post.is_flagged) || false
    const needsModeration = isNewUser || hasBeenFlagged

    // 8. CREATE POST
    const { data: newPost, error: insertError } = await supabase
      .from('unspoken_words')
      .insert({
        text: text.trim(),
        lat,
        lng,
        post_pin: post_pin?.length === 4 ? post_pin : null,
        user_ip: clientIP,
        is_visible: !needsModeration, // Hide if needs moderation
        is_flagged: needsModeration
      })
      .select('id, text, lat, lng, created_at, is_visible')
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw insertError
    }

    // 9. LOG RATE LIMIT ACTION
    await supabase.from('rate_limits').insert({
      fingerprint,
      ip_address: clientIP,
      action_type: 'post',
      user_agent: userAgent
    })

    // 10. SEND RESPONSE
    const response = {
      success: true,
      post: newPost,
      ...(needsModeration && { 
        message: 'Your post is under review and will be visible once approved' 
      })
    }

    return new Response(
      JSON.stringify(response), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create post. Please try again.' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})