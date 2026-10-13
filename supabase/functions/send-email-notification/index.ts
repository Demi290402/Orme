// supabase/functions/send-email-notification/index.ts
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

    const payload = await req.json()
    const { 
      groupId, 
      groupName = '', 
      excludeUserId, 
      type = 'generic',
      recipientEmail = '',
      subject: customSubject, 
      title: customTitle,
      body = '', 
      candidateName = '', 
      candidateNickname = '', 
      actionUrl, 
      actionLabel,
      reporterName = '',
      reporterEmail = '',
      reporterGroup = '',
      reporterRole = '',
      issueCategory = '',
      diagnosticInfo = null
    } = payload

    console.log(`[send-email-notification] Tipo: ${type}, Destinatario: ${recipientEmail || 'CoCa'}, Gruppo: ${groupId} (${groupName})`)

    let validEmails: string[] = []

    if (type === 'segnalazione_problema' || recipientEmail) {
      // Destinazione diretta: segnalazioni al supporto Orme o a email specifica
      validEmails = [recipientEmail || 'appormescout@gmail.com']
    } else {
      if (!groupId && !groupName) {
        throw new Error('Campo obbligatorio mancante (groupId o groupName)')
      }

      const supabaseAdmin = createClient(
        SUPABASE_URL ?? '',
        SUPABASE_SERVICE_ROLE_KEY ?? ''
      )

      // Cerca tutti i capi ATTIVI censiti nella Comunità Capi
      let query = supabaseAdmin
        .from('users')
        .select('email, id, first_name, last_name, membership_status')
        .eq('membership_status', 'attivo')

      if (groupId && groupName) {
        query = query.or(`group_id.eq.${groupId},group_name.eq.${groupName}`)
      } else if (groupId) {
        query = query.eq('group_id', String(groupId))
      } else if (groupName) {
        query = query.eq('group_name', String(groupName))
      }

      if (excludeUserId) {
        query = query.neq('id', excludeUserId)
      }

      const { data: users, error: usersErr } = await query
      if (usersErr) throw new Error(`DB Error: ${usersErr.message}`)
      
      // Filtra email uniche e valide
      validEmails = [...new Set(users
        ?.map((u: any) => (u.email || '').trim().toLowerCase())
        .filter((e: string) => e && e.includes('@') && !e.includes('example.com')))]

      console.log(`[send-email-notification] Destinatari attivi trovati: ${validEmails.length}`)

      if (validEmails.length === 0) {
        return new Response(JSON.stringify({ 
          message: "Nessun capo attivo con email valida trovato per questo gruppo.",
          recipientsCount: 0 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'appormescout@gmail.com'
    const senderName = type === 'segnalazione_problema' 
      ? 'Orme — Segnalazione Problema' 
      : (Deno.env.get('BREVO_SENDER_NAME') || 'Orme — Comunità Capi')

    // Definizione Oggetto, Titoli e Link in base al Tipo
    let finalSubject = customSubject || '[Orme] Notifica'
    let badgeText = 'NOTIFICA COMUNITÀ CAPI'
    let badgeColor = '#2F855A'
    let badgeBg = '#f0fff4'
    let mainHeading = customTitle || 'Nuova notifica per la tua Comunità Capi'
    let finalActionUrl = actionUrl || 'https://orme.pages.dev'
    let finalActionLabel = actionLabel || 'Accedi a Orme'
    let contentHtmlBlock = ''
    let textContent = ''

    const formattedCandidate = candidateNickname 
      ? `${candidateName} (${candidateNickname})` 
      : candidateName

    if (type === 'segnalazione_problema') {
      finalSubject = customSubject || `[Orme Segnalazione] ${issueCategory || 'Problema'}: ${customTitle || 'Nuova richiesta supporto'}`
      badgeText = '🚨 SEGNALAZIONE PROBLEMA & FEEDBACK'
      badgeColor = '#C53030'
      badgeBg = '#FFF5F5'
      mainHeading = customTitle || `Segnalazione: ${issueCategory || 'Problema riscontrato'}`
      finalActionUrl = reporterEmail ? `mailto:${reporterEmail}?subject=${encodeURIComponent(`Re: [Orme] ${finalSubject}`)}` : 'https://orme.pages.dev'
      finalActionLabel = reporterEmail ? `Rispondi a ${reporterName || reporterEmail}` : 'Accedi a Orme'

      const diag = diagnosticInfo || {}

      contentHtmlBlock = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: left;">
            <table style="width: 100%; border-collapse: collapse; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #718096; width: 140px;">Segnalatore:</td>
                    <td style="padding: 6px 0; font-size: 15px; font-weight: bold; color: #1a202c;">${reporterName || 'Utente Orme'}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #718096;">Email di contatto:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: bold; color: #2F855A;">${reporterEmail || 'Non specificata'}</td>
                </tr>
                ${reporterGroup ? `
                <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #718096;">Gruppo Scout:</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #1a202c;">${reporterGroup}${reporterRole ? ` (${reporterRole})` : ''}</td>
                </tr>` : ''}
                <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #718096;">Categoria:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: bold; color: #C53030;">${issueCategory || 'Generale'}</td>
                </tr>
            </table>
        </div>

        <div style="text-align: left; margin: 20px 0;">
            <p style="font-size: 13px; font-weight: bold; color: #4a5568; margin-bottom: 8px;">Descrizione del problema / richiesta:</p>
            <div style="background-color: #fffaf0; border-left: 4px solid #dd6b20; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; color: #2d3748; white-space: pre-wrap;">
                ${body}
            </div>
        </div>

        ${diag && (diag.browser || diag.os || diag.currentUrl || diag.screenSize) ? `
        <div style="background-color: #f7fafc; border: 1px dashed #cbd5e0; border-radius: 10px; padding: 14px 18px; margin: 20px 0; text-align: left; font-size: 12px; color: #718096;">
            <p style="font-size: 12px; font-weight: bold; color: #4a5568; margin: 0 0 6px 0;">💻 Informazioni Tecniche & Dispositivo:</p>
            <table style="width: 100%; border-collapse: collapse;">
                ${diag.os ? `<tr><td style="padding: 3px 0; width: 120px;">Sistema Operativo:</td><td style="font-weight: 600; color: #2d3748;">${diag.os}</td></tr>` : ''}
                ${diag.browser ? `<tr><td style="padding: 3px 0;">Browser:</td><td style="font-weight: 600; color: #2d3748;">${diag.browser}</td></tr>` : ''}
                ${diag.screenSize ? `<tr><td style="padding: 3px 0;">Risoluzione Schermo:</td><td style="color: #2d3748;">${diag.screenSize}</td></tr>` : ''}
                ${diag.currentUrl ? `<tr><td style="padding: 3px 0;">Pagina / URL:</td><td style="font-family: monospace; color: #2b6cb0;">${diag.currentUrl}</td></tr>` : ''}
            </table>
        </div>` : ''}
      `

      textContent = `
🚨 ORME — SEGNALAZIONE PROBLEMA
--------------------------------------------------
Nuova segnalazione inviata da un utente dell'app Orme.

DATI SEGNALATORE:
- Nome: ${reporterName || 'Utente Orme'}
- Email: ${reporterEmail || 'Non specificata'}
${reporterGroup ? `- Gruppo: ${reporterGroup} ${reporterRole ? `(${reporterRole})` : ''}\n` : ''}- Categoria: ${issueCategory || 'Generale'}

DESCRIZIONE DEL PROBLEMA:
${body}

${diag && (diag.browser || diag.os || diag.currentUrl || diag.screenSize) ? `
DATI TECNICI:
- OS: ${diag.os || '-'}
- Browser: ${diag.browser || '-'}
- Schermo: ${diag.screenSize || '-'}
- Pagina: ${diag.currentUrl || '-'}
` : ''}
--------------------------------------------------
Puoi rispondere direttamente a questa email per contattare ${reporterName || 'l\'utente'} all'indirizzo ${reporterEmail}.
      `.trim()

    } else if (type === 'richiesta_accesso') {
      finalSubject = customSubject || `[Orme] Richiesta di accesso: ${formattedCandidate} desidera entrare nel gruppo ${groupName || ''}`.trim()
      badgeText = '🔔 RICHIESTA DI ACCESSO IN CO.CA.'
      badgeColor = '#B7791F'
      badgeBg = '#FEFCBF'
      mainHeading = 'Nuova richiesta di ingresso in Comunità Capi'
      finalActionUrl = actionUrl || 'https://orme.pages.dev/verbali/membri?tab=sicurezza'
      finalActionLabel = actionLabel || 'Esamina e Vota la Richiesta'

      contentHtmlBlock = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: left;">
            <table style="width: 100%; border-collapse: collapse; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #718096; width: 140px;">Candidato:</td>
                    <td style="padding: 6px 0; font-size: 15px; font-weight: bold; color: #1a202c;">${candidateName || 'Nuovo Capo'}</td>
                </tr>
                ${candidateNickname ? `
                <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #718096;">Soprannome (Totem):</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: bold; color: #2F855A;">${candidateNickname}</td>
                </tr>` : ''}
                <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #718096;">Gruppo Richiesto:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: bold; color: #1a202c;">${groupName || 'La tua Comunità Capi'}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #718096;">Stato Accesso:</td>
                    <td style="padding: 6px 0; font-size: 13px; font-weight: bold; color: #d69e2e;">In attesa di approvazione (servono 2 voti)</td>
                </tr>
            </table>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #4a5568; margin: 15px 0;">
            ${body || `Il capo <strong>${formattedCandidate}</strong> sta chiedendo di accedere alla Comunità Capi su Orme senza codice di invito.`}
        </p>
        <div style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 12px 16px; border-radius: 6px; margin: 20px 0; text-align: left;">
            <p style="font-size: 12px; line-height: 1.5; color: #2b6cb0; margin: 0;">
                🛡️ <strong>Sicurezza & Privacy</strong>: I dati dei ragazzi, i verbali e la cassa sono protetti. L'utente rimarrà bloccato e non potrà vedere alcun dato del gruppo finché due capi censiti non confermano la sua identità.
            </p>
        </div>
      `

      textContent = `
⚜️ ORME — NOTIFICA COMUNITÀ CAPI
Nuova Richiesta di Accesso in Comunità Capi
--------------------------------------------------

Ciao,
ti informiamo che ${formattedCandidate} sta chiedendo di entrare a far parte della Comunità Capi del gruppo ${groupName || ''} su Orme.

DETTAGLI CANDIDATO:
- Nome e Cognome: ${candidateName || 'Nuovo Capo'}
${candidateNickname ? `- Soprannome: ${candidateNickname}\n` : ''}- Gruppo: ${groupName || ''}
- Stato: In attesa di approvazione (servono 2 conferme)

Per garantire la massima sicurezza e la privacy dei verbali e dei dati dei ragazzi, l'accesso a Orme per il tuo gruppo richiede l'approvazione di almeno due capi censiti.

Per esaminare il profilo del capo e confermare il suo ingresso, apri questo link su Orme:
${finalActionUrl}

--------------------------------------------------
Ricevi questa email in quanto capo attivo del gruppo ${groupName || ''} su Orme.
Supporto: ${senderEmail}
      `.trim()

    } else if (type === 'verbale') {
      finalSubject = customSubject || `[Orme] Nuovo Verbale di Comunità Capi — ${groupName || ''}`.trim()
      badgeText = '📋 VERBALE DI COMUNITÀ CAPI'
      badgeColor = '#2b6cb0'
      badgeBg = '#ebf8ff'
      mainHeading = customTitle || 'Nuovo Verbale Registrato'
      finalActionUrl = actionUrl || 'https://orme.pages.dev/verbali'
      finalActionLabel = actionLabel || 'Leggi il Verbale su Orme'

      contentHtmlBlock = `
        <div style="margin: 20px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #edf2f7; text-align: left;">
            <p style="font-size: 15px; line-height: 1.6; color: #2d3748; margin: 0;">
                ${body}
            </p>
        </div>
      `

      textContent = `
⚜️ ORME — COMUNITÀ CAPI
Nuovo Verbale Registrato
--------------------------------------------------

${body}

Visualizza il verbale su Orme:
${finalActionUrl}

--------------------------------------------------
Ricevi questa email in quanto capo attivo della Comunità Capi ${groupName || ''} su Orme.
Supporto: ${senderEmail}
      `.trim()

    } else {
      // Notifica Generica
      contentHtmlBlock = `
        <div style="margin: 20px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #edf2f7; text-align: left;">
            <p style="font-size: 15px; line-height: 1.6; color: #2d3748; margin: 0;">
                ${body}
            </p>
        </div>
      `
      textContent = `
⚜️ ORME — COMUNITÀ CAPI
--------------------------------------------------
${mainHeading}

${body}

Accedi a Orme:
${finalActionUrl}

--------------------------------------------------
Ricevi questa email in quanto capo della Comunità Capi su Orme.
Supporto: ${senderEmail}
      `.trim()
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Contenitore Principale -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- Top Stripe Verde Bosco Scout -->
          <tr>
            <td style="background-color: #2F855A; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          
          <!-- Header Brand -->
          <tr>
            <td style="padding: 30px 30px 20px 30px; text-align: center; border-bottom: 1px solid #f0f4f8;">
              <span style="font-size: 28px; line-height: 1;">⚜️</span>
              <h2 style="margin: 8px 0 2px 0; color: #2F855A; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">ORME</h2>
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #718096; letter-spacing: 1px;">Piattaforma Comunità Capi</p>
            </td>
          </tr>

          <!-- Corpo Messaggio -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <!-- Badge Categoria -->
              <div style="display: inline-block; padding: 5px 14px; background-color: ${badgeBg}; color: ${badgeColor}; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 15px;">
                ${badgeText}
              </div>

              <!-- Titolo Principale -->
              <h1 style="color: #1a202c; font-size: 22px; font-weight: 800; line-height: 1.3; margin: 0 0 10px 0;">
                ${mainHeading}
              </h1>

              ${groupName ? `
              <p style="color: #718096; font-size: 14px; font-weight: 600; margin: 0 0 20px 0;">
                Gruppo Scout: <span style="color: #2F855A;">${groupName}</span>
              </p>
              ` : ''}

              <!-- Contenuto dinamico -->
              ${contentHtmlBlock}

              <!-- Pulsante di Chiamata all'Azione (CTA) Bulletproof -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 30px auto 10px auto;">
                <tr>
                  <td align="center" style="border-radius: 12px; background-color: #2F855A;">
                    <a href="${finalActionUrl}" target="_blank" style="font-size: 15px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; font-weight: bold; text-decoration: none; border-radius: 12px; padding: 14px 28px; border: 1px solid #2F855A; display: inline-block; box-shadow: 0 3px 6px rgba(47, 133, 90, 0.25);">
                      ${finalActionLabel} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link alternativo anti-blocco -->
              <p style="font-size: 11px; color: #a0aec0; margin-top: 20px; word-break: break-all;">
                Se il pulsante non funziona, apri: <a href="${finalActionUrl}" style="color: #2F855A; text-decoration: underline;">${finalActionUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer di Conformità e Anti-Spam -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #edf2f7;">
              <p style="font-size: 11px; color: #718096; line-height: 1.5; margin: 0;">
                ${type === 'segnalazione_problema' 
                  ? 'Questa è una segnalazione di supporto inviata tramite l\'app <strong>Orme</strong>.' 
                  : `Ricevi questa email automatica in quanto capo attivo e censito nella Comunità Capi${groupName ? ` del <strong>${groupName}</strong>` : ''} su <strong>Orme</strong>.`}
              </p>
              <p style="font-size: 11px; color: #a0aec0; margin: 8px 0 0 0;">
                ${type === 'segnalazione_problema' && reporterEmail
                  ? `Puoi rispondere direttamente a questa email per contattare ${reporterName || 'l\'utente'} (${reporterEmail})`
                  : `Hai bisogno di aiuto o vuoi segnalare un errore? Rispondi a questa email o scrivi a <a href="mailto:${senderEmail}" style="color: #2F855A; text-decoration: none;">${senderEmail}</a>`}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    // Invio tramite Brevo SMTP API v3 con supporto MIME completo (HTML + Text)
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: validEmails.map(email => ({ email })),
        replyTo: reporterEmail ? {
          email: reporterEmail,
          name: reporterName || 'Utente Orme'
        } : {
          email: senderEmail,
          name: 'Supporto Orme'
        },
        subject: finalSubject,
        htmlContent: htmlContent,
        textContent: textContent,
        headers: {
          'X-Mailer': 'Orme Platform Scout',
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
          'Precedence': 'bulk'
        }
      })
    })

    const resData = await response.json()

    if (!response.ok) {
      console.error('[send-email-notification] Errore Brevo API:', resData)
      throw new Error(`Errore invio email (Brevo): ${resData.message || JSON.stringify(resData)}`)
    }

    console.log(`[send-email-notification] Email inviata con successo a ${validEmails.length} destinatari. MessageId: ${resData.messageId || 'OK'}`)

    return new Response(JSON.stringify({
      success: true,
      recipientsCount: validEmails.length,
      resData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('[send-email-notification] Errore critico:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
