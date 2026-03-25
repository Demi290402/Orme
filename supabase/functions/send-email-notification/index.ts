// supa/functions/send-email-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Pre-flight CORS for browser calls
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured. Please add it to Supabase Edge Function environment variables.')
    }

    const { groupId, excludeUserId, subject, body } = await req.json()

    if (!groupId || !subject || !body) {
      throw new Error('Missing required fields (groupId, subject, body)')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Fetch users in the same group, excluding the sender
    const { data: users, error: usersErr } = await supabaseClient
      .from('users')
      .select('email')
      .eq('group_id', groupId)

    if (usersErr) throw usersErr
    
    // Filter out empty emails
    const validEmails = users
      ?.map(u => u.email)
      .filter(e => e && e.includes('@')) || []

    if (validEmails.length === 0) {
      return new Response(JSON.stringify({ message: "No users found with valid emails" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Send email via Resend
    // Resend free tier allows 100 emails / day.
    // To send to multiple people at once, we use BCC.
    const resendReq = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Orme Notifiche <onboarding@resend.dev>', // Change to your verified domain later
        to: 'no-reply@orme.app',
        bcc: validEmails,
        subject: subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2F855A; text-align: center;">Orme App</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <p style="font-size: 16px; line-height: 1.5; color: #333;">${body}</p>
            </div>
            <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
              Questa è una notifica automatica dal tuo gruppo scout su Orme.
            </p>
          </div>
        `
      })
    })

    const resendRes = await resendReq.json()

    if (!resendReq.ok) {
        throw new Error(`Resend Error: ${JSON.stringify(resendRes)}`)
    }

    return new Response(JSON.stringify(resendRes), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
