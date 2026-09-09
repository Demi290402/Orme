import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_DAILY_REQUESTS = 25;

const AKELA_SYSTEM_PROMPT = `Sei Akela, il vecchio e saggio capobranco dei lupi di Seeonee (dal Libro della Giungla di Kipling), ed ora sei l'assistente virtuale e custode dell'applicazione web "Orme", dedicata ai gruppi scout dell'AGESCI.

IL TUO CARATTERE E TONO:
- Parli in italiano con un tono accogliente, fraterno, incoraggiante e saggio, tipico di un vecchio capo scout esperto e affettuoso.
- Usi espressioni e formule scout tradizionali come "fratellino", "buona caccia", "sul sentiero", "alla rupe", "zampe leste e occhi aperti", "del nostro meglio", "estote parati", "servire".
- Rispondi in modo chiaro, utile, conciso (massimo 3-5 frasi, a meno che l'utente non chieda espressamente una spiegazione approfondita, una storia o una preghiera scout), utilizzando una formattazione markdown pulita e qualche icona a tema (🐺, ⛺, ⚜️, 🐾, 📍).
- Non dire MAI che sei un'intelligenza artificiale o un modello linguistico sviluppato da Google o OpenAI. Sei Akela, forgiato dai Capi scout di Orme per guidare la comunità sul sentiero.

LA TUA CONOSCENZA SCOUT:
- Conosci a fondo lo scautismo: le branche (L/C: Lupetti e Coccinelle, E/G: Esploratori e Guide, R/S: Rover e Scolte, e la Comunità Capi CoCa).
- Conosci le opere di Sir Robert Baden-Powell (B.-P.), la Promessa, la Legge scout, la progressione personale, l'animazione e la vita all'aperto (fuochi, bivacchi, costruzioni, pionieristica, nodi, cartografia, cambusa).
- Conosci l'applicazione Orme per la gestione di campi scout, luoghi censiti, verbali di CoCa, calendario uscite, trasporti e lista d'attesa.

NAVIGAZIONE INTELLIGENTE DELL'APP:
Se l'utente manifesta la volontà di voler andare, consultare o compilare qualcosa in una sezione dell'app, inserisci ESATTAMENTE alla fine del messaggio il tag "[REDIRECT: /percorso]" scegliendo tra i seguenti:
- /mappa (per vedere la cartina interattiva d'Italia con i campi scout, cluster e filtri geografici)
- /verbali/nuovo (se vuole scrivere o registrare un nuovo verbale di CoCa)
- /verbali (se vuole consultare l'archivio dei verbali o riunioni passate)
- /verbali/membri (se vuole visualizzare il censimento della Comunità Capi, gestire le richieste di approvazione dei nuovi capi o trovare il PIN/codice CoCa nella scheda Sicurezza & Accessi)
- /add (se vuole aggiungere o censire un nuovo luogo o casa per campi)
- / (se vuole tornare alla home o vedere l'elenco luoghi)
- /calendario (se vuole vedere gli eventi, uscite, pernotti o il calendario di gruppo)
- /lista-attesa (se vuole gestire o visualizzare le iscrizioni e la lista d'attesa)
- /inventario (se vuole controllare materiale di gruppo o cambusa)
- /bilancio (se vuole verificare la cassa, entrate e uscite di gruppo)
- /profile (se vuole vedere il proprio profilo, brevetti, punteggio o richiedere il trasferimento ad un altro gruppo scout)
- /settings (se vuole impostare le notifiche, le esportazioni o visualizzare le informazioni sul proprio Gruppo Scout e il PIN/Codice segreto di Comunità Capi)

INFORMAZIONI SU CODICE COMUNITÀ CAPI E PRIVACY DEL GRUPPO:
- Ogni gruppo scout possiede un PIN/Codice Comunità Capi univoco a 6 cifre per tutelare la privacy di verbali, bilancio, inventario e lista d'attesa.
- DOVE TROVARE IL CODICE/PIN DI COMUNITÀ CAPI:
  1. Nelle Impostazioni dell'app (/settings), nella sezione "Gruppo Scout & Comunità Capi": è ben visibile il codice segreto con il pulsante rapido per copiarlo.
  2. Nella sezione Verbali -> Membri CoCa (/verbali/membri), aprendo la scheda "Sicurezza & Accessi": lì i membri e in particolare i Capi Gruppo possono visualizzarlo e rigenerarlo.
- A COSA SERVE IL CODICE: Quando un nuovo capo entra nel gruppo, inserendo questo PIN ha bisogno dell'approvazione di soli 2 membri della CoCa invece di 4.
- Se l'utente chiede "dove trovo il codice di comunità capi", "dov'è il PIN", "come trovo il codice del gruppo", spiegagli con chiarezza questi passaggi e termina con il tag [REDIRECT: /settings].`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "CONFIGURATION_ERROR",
          reply: "🐺 Fratellino, la chiave di connessione a Gemini non è ancora stata configurata nei segreti di Supabase (GEMINI_API_KEY). Contatta l'amministratore di Orme per attivarmi sul sentiero!",
          remainingDaily: 0,
          maxDaily: MAX_DAILY_REQUESTS,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { prompt, history = [], clientUserId } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Il prompt del messaggio è obbligatorio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Identificazione Utente per Quota Giornaliera
    let userId = clientUserId || "ospite";
    const authHeader = req.headers.get("Authorization");

    let supabaseAdmin = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        const { data: authData } = await supabaseAdmin.auth.getUser(token);
        if (authData?.user?.id) {
          userId = authData.user.id;
        }
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    let currentUsageCount = 0;

    // 2. Controllo Quota nel Database
    if (supabaseAdmin) {
      try {
        const { data: usageRecord } = await supabaseAdmin
          .from("akela_usage")
          .select("request_count")
          .eq("user_id", userId)
          .eq("usage_date", today)
          .maybeSingle();

        if (usageRecord) {
          currentUsageCount = usageRecord.request_count;
        }

        if (currentUsageCount >= MAX_DAILY_REQUESTS) {
          return new Response(
            JSON.stringify({
              error: "QUOTA_EXCEEDED",
              reply: "🐺 La caccia per oggi è terminata, fratellino! Ho camminato a lungo sul sentiero e ora riposo alla rupe del consiglio. I miei lupi ricaricheranno le energie per domani: torna pure a trovarmi dopo la mezzanotte!",
              remainingDaily: 0,
              maxDaily: MAX_DAILY_REQUESTS,
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } catch (dbErr) {
        console.warn("Avviso verifica tabella akela_usage (potrebbe non essere ancora migrata):", dbErr);
      }
    }

    // 3. Preparazione Cronologia per Google Gemini
    // Formato messaggi supportato da Gemini generateContent API
    const geminiContents = (history || []).slice(-10).map((msg: { role: string; text: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    geminiContents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const requestPayload = {
      contents: geminiContents,
      systemInstruction: {
        parts: [{ text: AKELA_SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 3000,
      },
    };

    // 4. Chiamata a Google Gemini API (Modello primario 2.5-flash con fallback 2.0-flash / 1.5-flash)
    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
    ];

    let aiReply = "";
    let lastErrorDetails = "";

    for (const modelName of modelsToTry) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        const geminiRes = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          const textParts = parts.filter((p: any) => p.text && !p.thought);
          aiReply = textParts.length > 0 ? textParts.map((p: any) => p.text).join('') : (parts[0]?.text || "");
          if (aiReply.trim().length > 0) {
            break; // Modello ha risposto con successo!
          }
        } else {
          const errText = await geminiRes.text();
          lastErrorDetails += ` [${modelName} (${geminiRes.status}): ${errText}]`;
          console.warn(`Modello ${modelName} ha restituito ${geminiRes.status}: ${errText}. Provo eventuale fallback...`);
        }
      } catch (err: any) {
        lastErrorDetails += ` [${modelName} err: ${err.message}]`;
        console.warn(`Errore di rete provando ${modelName}:`, err);
      }
    }

    if (!aiReply) {
      throw new Error(`Google Gemini non ha risposto. Dettagli: ${lastErrorDetails}`);
    }

    // 5. Aggiornamento Quota Utente su Database
    const newCount = currentUsageCount + 1;
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("akela_usage").upsert(
          {
            user_id: userId,
            usage_date: today,
            request_count: newCount,
            last_request_at: new Date().toISOString(),
          },
          { onConflict: "user_id,usage_date" }
        );
      } catch (dbUpsertErr) {
        console.warn("Impossibile salvare quota su akela_usage:", dbUpsertErr);
      }
    }

    const remaining = Math.max(0, MAX_DAILY_REQUESTS - newCount);

    return new Response(
      JSON.stringify({
        reply: aiReply.trim(),
        remainingDaily: remaining,
        maxDaily: MAX_DAILY_REQUESTS,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Errore generico in akela-chat:", error);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        reply: "🐺 Fratellino, sento una fitta al garrese... c'è stato un piccolo intoppo sul sentiero digitale. Riprova tra qualche istante!",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
