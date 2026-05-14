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
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY non configurata nei segreti di Supabase.')
    }

    const { groupId, excludeUserId, subject, body } = await req.json()
    console.log(`Richiesta notifica per gruppo: ${groupId}, escludendo utente: ${excludeUserId}`)

    if (!groupId || !subject || !body) {
      throw new Error('Campi obbligatori mancanti (groupId, subject, body)')
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL ?? '',
      SUPABASE_SERVICE_ROLE_KEY ?? ''
    )

    console.log(`Inizializzazione query per group_id="${groupId}"`)
    let query = supabaseAdmin
      .from('users')
      .select('email, id')
      .eq('group_id', String(groupId))

    if (excludeUserId) {
      query = query.neq('id', excludeUserId)
    }

    const { data: users, error: usersErr } = await query
    if (usersErr) throw new Error(`DB Error: ${usersErr.message}`)
    
    // Filter out duplicate emails and the verified sender if present (to avoid loops)
    const validEmails = [...new Set(users
      ?.map((u: any) => u.email)
      .filter((e: any) => e && e.includes('@')))]

    console.log(`Destinatari trovati: ${validEmails.length}`)

    if (validEmails.length === 0) {
      return new Response(JSON.stringify({ message: "Nessun destinatario trovato." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Send email via Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          name: 'Orme App',
          email: 'appormescout@gmail.com' // Il tuo alias verificato su Brevo
        },
        to: validEmails.map(email => ({ email })), // Invio a tutti
        replyTo: {
          email: 'appormescout@gmail.com',
          name: 'Supporto Orme'
        },
        subject: subject,
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; border-top: 5px solid #2F855A;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #2F855A; margin:0;">Orme</h1>
                <p style="color: #718096; font-size: 14px; margin-top: 5px;">Diario di Bordo & Notifiche</p>
            </div>
            <div style="background-color: #f7fafc; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0;">
              <p style="font-size: 16px; line-height: 1.6; color: #2d3748; margin: 0;">${body}</p>
            </div>
            <div style="margin-top: 30px; text-align: center;">
                <a href="https://orme.pages.dev" style="background-color: #2F855A; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Apri l'app</a>
            </div>
            <p style="font-size: 11px; color: #a0aec0; text-align: center; margin-top: 40px; border-top: 1px solid #edf2f7; pt-20">
              Questa è una notifica automatica. Per domande contatta appormescout@gmail.com
            </p>
          </div>
        `
      })
    })

    const resData = await response.json()

    if (!response.ok) {
        console.error('Errore Brevo API:', resData)
        throw new Error(`Errore invio email (Brevo): ${resData.message || JSON.stringify(resData)}`)
    }

    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Errore critico:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
