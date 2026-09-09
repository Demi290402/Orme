import { supabase } from './supabase';

export interface AIMessage {
    role: 'user' | 'model';
    text: string;
}

export interface AkelaChatResponse {
    reply: string;
    remainingDaily: number;
    maxDaily: number;
    redirectPath?: string;
}

/**
 * Invia una richiesta all'intelligenza di Akela tramite la Supabase Edge Function sicura.
 * Custodisce la chiave API lato server, garantisce zero configurazioni per l'utente finale
 * e gestisce il limite giornaliero di token.
 */
export async function askAkelaBot(
    history: AIMessage[],
    prompt: string,
    clientUserId?: string
): Promise<AkelaChatResponse> {
    const { data, error } = await supabase.functions.invoke('akela-chat', {
        body: {
            prompt,
            history,
            clientUserId,
        },
    });

    if (error) {
        let errorDetails = error.message;
        if ((error as any).context) {
            try {
                const ctx = await (error as any).context.text();
                if (ctx) errorDetails = ctx;
            } catch {}
        }
        console.error('Errore invocazione akela-chat:', errorDetails);
        throw new Error(errorDetails || 'Errore di connessione con Akela');
    }

    if (!data) {
        throw new Error('Nessuna risposta ricevuta da Akela');
    }

    let reply = data.reply || '';
    let redirectPath: string | undefined = undefined;

    // Rileva ed estrae l'eventuale tag di navigazione [REDIRECT: /percorso]
    const redirectMatch = reply.match(/\[REDIRECT:\s*(\/[a-zA-Z0-9_\-/]*)\]/i);
    if (redirectMatch) {
        redirectPath = redirectMatch[1];
        reply = reply.replace(redirectMatch[0], '').trim();
    }

    return {
        reply,
        remainingDaily: typeof data.remainingDaily === 'number' ? data.remainingDaily : 25,
        maxDaily: typeof data.maxDaily === 'number' ? data.maxDaily : 25,
        redirectPath,
    };
}
