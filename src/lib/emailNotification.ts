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
