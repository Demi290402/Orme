import { supabase } from './supabase';

export interface GroupEmailNotificationParams {
    groupId: string;
    groupName?: string;
    excludeUserId?: string;
    type?: 'richiesta_accesso' | 'nuovo_capo' | 'verbale' | 'generic';
    subject?: string;
    title?: string;
    body: string;
    candidateName?: string;
    candidateNickname?: string;
    actionUrl?: string;
    actionLabel?: string;
}

export interface IssueReportParams {
    userId?: string;
    reporterName: string;
    reporterEmail: string;
    reporterGroup?: string;
    reporterRole?: string;
    category: string;
    title: string;
    description: string;
    deviceInfo?: {
        browser?: string;
        os?: string;
        screenSize?: string;
        currentUrl?: string;
        userAgent?: string;
    };
}

/**
 * Invia una notifica email all'intera Comunità Capi (membri attivi)
 * tramite la Supabase Edge Function 'send-email-notification'.
 */
export async function sendGroupEmailNotification(params: GroupEmailNotificationParams): Promise<{ success: boolean; error?: string }> {
    try {
        const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
        const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

        let errorMsg: string | null = null;

        // 1. Invio tramite Supabase Functions SDK
        try {
            const { data, error } = await supabase.functions.invoke('send-email-notification', {
                body: params
            });

            if (error) {
                errorMsg = error.message;
                if ((error as any).context) {
                    try {
                        const ctxText = await (error as any).context.text();
                        if (ctxText) errorMsg = ctxText;
                    } catch {}
                }
            } else if (data && data.error) {
                errorMsg = data.error;
            } else {
                return { success: true };
            }
        } catch (invokeErr: any) {
            errorMsg = invokeErr.message || String(invokeErr);
        }

        // 2. Fallback via fetch diretta se il client SDK ha restituito un errore temporaneo
        if (errorMsg && supabaseUrl && supabaseKey) {
            try {
                const res = await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                    },
                    body: JSON.stringify(params),
                });

                if (res.ok) {
                    return { success: true };
                }
                const txt = await res.text();
                return { success: false, error: txt || `HTTP ${res.status}` };
            } catch (fetchErr: any) {
                return { success: false, error: fetchErr.message || errorMsg };
            }
        }

        return { success: false, error: errorMsg || 'Errore sconosciuto durante l\'invio email' };
    } catch (e: any) {
        console.warn('sendGroupEmailNotification non riuscito:', e);
        return { success: false, error: e.message || String(e) };
    }
}

/**
 * Invia una segnalazione di problema/feedback alla mail del team (appormescout@gmail.com)
 * e registra la segnalazione nella tabella Supabase segnalazioni_problemi (se presente).
 */
export async function sendIssueReportNotification(params: IssueReportParams): Promise<{ success: boolean; error?: string }> {
    // 1. Salva la segnalazione sul database per storicizzazione (opzionale, non blocca l'invio email)
    try {
        await supabase.from('segnalazioni_problemi').insert({
            user_id: params.userId || null,
            reporter_name: params.reporterName,
            reporter_email: params.reporterEmail,
            reporter_group: params.reporterGroup || null,
            category: params.category,
            title: params.title,
            description: params.description,
            device_info: params.deviceInfo || null,
            status: 'aperta'
        });
    } catch (dbErr) {
        console.info('[sendIssueReportNotification] DB insert non disponibile (continuo con invio email):', dbErr);
    }

    // 2. Invio email a appormescout@gmail.com tramite la Edge Function
    const payload = {
        type: 'segnalazione_problema',
        recipientEmail: 'appormescout@gmail.com',
        subject: `[Segnalazione Orme] ${params.category}: ${params.title}`,
        title: params.title,
        body: params.description,
        reporterName: params.reporterName,
        reporterEmail: params.reporterEmail,
        reporterGroup: params.reporterGroup,
        reporterRole: params.reporterRole,
        issueCategory: params.category,
        diagnosticInfo: params.deviceInfo
    };

    try {
        const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
        const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

        let errorMsg: string | null = null;

        try {
            const { data, error } = await supabase.functions.invoke('send-email-notification', {
                body: payload
            });

            if (error) {
                errorMsg = error.message;
                if ((error as any).context) {
                    try {
                        const ctxText = await (error as any).context.text();
                        if (ctxText) errorMsg = ctxText;
                    } catch {}
                }
            } else if (data && data.error) {
                errorMsg = data.error;
            } else {
                return { success: true };
            }
        } catch (invokeErr: any) {
            errorMsg = invokeErr.message || String(invokeErr);
        }

        // Fallback REST fetch diretta
        if (errorMsg && supabaseUrl && supabaseKey) {
            try {
                const res = await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                    },
                    body: JSON.stringify(payload),
                });

                if (res.ok) {
                    return { success: true };
                }
                const txt = await res.text();
                return { success: false, error: txt || `HTTP ${res.status}` };
            } catch (fetchErr: any) {
                return { success: false, error: fetchErr.message || errorMsg };
            }
        }

        return { success: false, error: errorMsg || 'Errore durante l\'invio della segnalazione' };
    } catch (e: any) {
        console.error('sendIssueReportNotification errore:', e);
        return { success: false, error: e.message || String(e) };
    }
}

/**
 * Crea un link mailto: precompilato per consentire all'utente di inviare
 * la segnalazione direttamente dalla propria applicazione di posta.
 */
export function buildReportMailtoUrl(params: {
    category: string;
    title: string;
    description: string;
    reporterName?: string;
    reporterGroup?: string;
    deviceInfo?: {
        browser?: string;
        os?: string;
        screenSize?: string;
        currentUrl?: string;
    };
}): string {
    const subject = `[Segnalazione Orme] ${params.category}: ${params.title || 'Richiesta di supporto'}`;
    const bodyLines = [
        `Ciao team di Orme,`,
        ``,
        `Desidero inviare la seguente segnalazione:`,
        ``,
        `CATEGORIA: ${params.category}`,
        `TITOLO: ${params.title}`,
        ``,
        `DESCRIZIONE DETTAGLIATA:`,
        params.description,
        ``,
        `----------------------------------------`,
        `DATI SEGNALATORE:`,
        `Nome: ${params.reporterName || 'Utente Orme'}`,
        `Gruppo: ${params.reporterGroup || 'Non specificato'}`,
        ``,
        ...(params.deviceInfo ? [
            `DATI TECNICI DEL DISPOSITIVO:`,
            `- Sistema Operativo: ${params.deviceInfo.os || 'N/A'}`,
            `- Browser: ${params.deviceInfo.browser || 'N/A'}`,
            `- Risoluzione Schermo: ${params.deviceInfo.screenSize || 'N/A'}`,
            `- Pagina da cui è partita la segnalazione: ${params.deviceInfo.currentUrl || 'N/A'}`,
            ``
        ] : []),
        `Buona caccia e buona strada! 🐾`
    ];

    return `mailto:appormescout@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
}
