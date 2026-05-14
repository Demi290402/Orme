// supa/functions/send-email-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY non configurata nei segreti di Supabase.')
    }

    const { groupId, excludeUserId, subject, body } = await req.json()
    console.log(`Richiesta notifica per gruppo: ${groupId}, escludendo utente: ${excludeUserId}`)

    if (!groupId || !subject || !body) {
      throw new Error('Campi obbligatori mancanti (groupId, subject, body)')
    }

    // Initialize Supabase client with SERVICE ROLE KEY to bypass RLS for fetching emails
    // We still want to verify the user's identity if possible, but for fetching emails of others
    // we definitely need more power than ANON key usually provides.
    const supabaseAdmin = createClient(
      SUPABASE_URL ?? '',
      SUPABASE_SERVICE_ROLE_KEY ?? ''
    )

    // Fetch users in the same group, optionally excluding the sender
    let query = supabaseAdmin
      .from('users')
      .select('email, id')
      .eq('group_id', groupId)

    if (excludeUserId) {
      query = query.ne('id', excludeUserId)
    }

    const { data: users, error: usersErr } = await query

    if (usersErr) {
      console.error('Errore durante il recupero degli utenti:', usersErr)
      throw usersErr
    }
    
    const validEmails = users
      ?.map(u => u.email)
      .filter(e => e && e.includes('@')) || []

    console.log(`Trovati ${validEmails.length} destinatari validi:`, validEmails)

    if (validEmails.length === 0) {
      return new Response(JSON.stringify({ message: "Nessun destinatario con email valida trovato nel gruppo." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Send email via Resend
    const resendReq = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Orme App <onboarding@resend.dev>',
        to: validEmails[0],       // Resend richiede almeno un destinatario nel campo "to"
        bcc: validEmails.slice(1),// Gli altri in BCC per privacy
        reply_to: 'appormescout@gmail.com',
        subject: subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; border-top: 5px solid #2F855A;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #2F855A; margin:0;">Orme</h1>
                <p style="color: #718096; font-size: 14px; margin-top: 5px;">Diario di Bordo & Notifiche</p>
            </div>
            <div style="background-color: #f7fafc; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0;">
              <p style="font-size: 16px; line-height: 1.6; color: #2d3748; margin: 0;">${body}</p>
            </div>
            <div style="margin-top: 30px; text-align: center;">
                <a href="https://orme.app" style="background-color: #2F855A; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Apri l'app</a>
            </div>
            <p style="font-size: 11px; color: #a0aec0; text-align: center; margin-top: 40px; border-top: 1px solid #edf2f7; pt-20">
              Questa è una notifica automatica. Per domande contatta appormescout@gmail.com
            </p>
          </div>
        `
      })
    })

    const resendRes = await resendReq.json()

    if (!resendReq.ok) {
        console.error('Errore Resend API:', resendRes)
        throw new Error(`Errore invio email (Resend): ${resendRes.message || JSON.stringify(resendRes)}`)
    }

    return new Response(JSON.stringify(resendRes), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Errore critico nella Edge Function:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
