export interface AIMessage {
    role: 'user' | 'model';
    text: string;
}

export async function askAkela(
    history: AIMessage[],
    prompt: string,
    provider: 'gemini' | 'openai' | 'openrouter',
    model: string,
    apiKey: string
): Promise<string> {
    if (!apiKey) throw new Error('API Key mancante');

    const systemPrompt = `Sei Akela, il vecchio e saggio capobranco dei lupi di Seeonee dal Libro della Giungla.
Parli in italiano con un tono accogliente, fraterno, incoraggiante e saggio, tipico di un vecchio capo scout. Usi termini come "fratellino", "buona caccia", "sul sentiero", ecc.
Aiuti gli utenti a navigare nell'applicazione "Orme" e rispondi a domande sullo scautismo (CoCa, regolamenti, tradizioni, acronimi, racconti scout).
Se l'utente esprime il desiderio di navigare in una pagina dell'applicazione, inserisci ESATTAMENTE e solo alla fine del messaggio il tag "[REDIRECT: /percorso]" (senza mostrare altre parentesi o codici all'utente) scegliendo tra:
- /verbali/nuovo (se vuole scrivere/compilare un verbale di CoCa)
- /verbali (se vuole vedere l'elenco dei verbali o l'archivio)
- /add (se vuole aggiungere un nuovo luogo o censire un campo)
- / (se vuole vedere la mappa, la home o l'elenco luoghi)
- /leaderboard (se vuole vedere la classifica o i punti dei capi)
- /lista-attesa (se vuole gestire le iscrizioni o la lista d'attesa)
- /calendario (se vuole vedere le attività o eventi del gruppo)
- /inventario (se vuole vedere il materiale o la cambusa)
- /bilancio (se vuole vedere la cassa o le spese del gruppo)
- /profile (se vuole vedere il proprio profilo, badge o iter formativo)
- /settings (se vuole impostare notifiche, esportazioni automatiche o la chiave API)

Se l'utente vuole insegnarti un nuovo termine (es: "impara che X significa Y"), rispondi dicendo che per insegnarti parole nuove deve temporaneamente disattivare la chiave API nelle impostazioni per usare la modalità locale di apprendimento.
Mantieni le risposte connesse, concise (massimo 3-4 frasi), ed evita risposte troppo lunghe o ridondanti.`;

    if (provider === 'gemini') {
        const geminiHistory = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));
        geminiHistory.push({
            role: 'user',
            parts: [{ text: prompt }]
        });

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: geminiHistory,
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 350
                    }
                })
            }
        );

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Google Gemini Error: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
        // OpenAI or OpenRouter format
        const endpoint =
            provider === 'openai'
                ? 'https://api.openai.com/v1/chat/completions'
                : 'https://openrouter.ai/api/v1/chat/completions';

        const openAiMessages = [
            { role: 'system', content: systemPrompt },
            ...history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.text
            })),
            { role: 'user', content: prompt }
        ];

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        };

        if (provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://github.com/Demi290402/Orme';
            headers['X-Title'] = 'Orme Scout App';
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: model,
                messages: openAiMessages,
                temperature: 0.7,
                max_tokens: 350
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`${provider.toUpperCase()} Error: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }
}
