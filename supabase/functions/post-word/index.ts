import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. DATA CAPTURE
    const { word, lat, lng, captchaToken } = await req.json()
    // Capture the raw IP header which might contain multiple IPs
    const rawIP = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || "unknown";
    
    // Get the first IP in the chain for a clean log
    const clientIP = rawIP.split(',')[0].trim();

    // 2. VERIFY CAPTCHA (Turnstile)
    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${Deno.env.get('TURNSTILE_SECRET_KEY')}&response=${captchaToken}`,
      }
    )
    const verification = await verifyResponse.json()
    
    if (!verification.success) {
      return new Response(JSON.stringify({ error: 'CAPTCHA Verification Failed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. BLACKLIST CHECK (The "Partial Match" Fix)
    // Using .ilike ensures that if your IP is part of a list, it still gets caught
    const { data: isBlocked } = await supabaseAdmin
      .from('blacklisted_ips')
      .select('ip')
      .ilike('ip', `%${clientIP}%`) 
      .maybeSingle();

    if (isBlocked) {
      return new Response(JSON.stringify({ error: 'Your IP is banned.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. INSERT DATA
    const { data, error } = await supabaseAdmin
      .from('unspoken_words')
      .insert({ text: word, lat: lat, lng: lng, user_ip: rawIP })
      .select().single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})