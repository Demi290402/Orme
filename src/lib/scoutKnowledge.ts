export interface ScoutArticle {
    id: string;
    title: string;
    keywords: string[];
    category: 'bp_books' | 'manuali_agesci' | 'fiordaliso' | 'small_talk' | 'dizionario';
    summary: string;
    content: string;
}

export const scoutKnowledgeBase: ScoutArticle[] = [
    {
        id: 'bp_libri_overview',
        title: 'Libri di Baden-Powell / Bibliografia Scout',
        keywords: [
            'libri di bp', 'libri di baden powell', 'bibliografia baden powell', 'cosa ha scritto baden powell', 
            'quanti libri', 'quali libri', 'opere di bp', 'libri scritti da bp', 'libri di bp'
        ],
        category: 'bp_books',
        summary: 'Panoramica completa dei principali libri scritti dal fondatore dello scautismo Robert Baden-Powell.',
        content: `🐺 Sir Robert Baden-Powell ha scritto più di 30 libri durante la sua vita per spiegare il metodo scout e guidare ragazzi e capi. Ecco le sue opere più celebri e fondamentali:

1. 📖 **Scautismo per Ragazzi (1908)**: Il testo fondamentale che descrive il metodo e la Legge Scout attraverso il gioco, il campeggio e la vita all'aperto.
2. 📖 **Il Libro dei Capi (1919)**: Rivolto agli adulti e capi scout per aiutarli a comprendere lo spirito del servizio e la pedagogia del "learning by doing".
3. 📖 **La Strada verso il Successo (1922)**: Dedicato ai Rover (ragazzi più grandi), un manuale di vita per superare gli scogli dell'esistenza.
4. 📖 **Guida da te la tua Canoa (1930)**: Una raccolta di aforismi e lezioni per incoraggiare la responsabilità personale e l'autoeducazione.
5. 📖 **Taccuino Scout / La mia vita da scout**: Scritti e appunti personali autobiografici sul cammino scout.

*Se vuoi dettagli su uno di questi libri in particolare, chiedimi pure!* ⚜️`
    },
    // BADEN-POWELL BOOKS
    {
        id: 'scautismo_per_ragazzi',
        title: 'Scautismo per Ragazzi (Scouting for Boys) - Baden-Powell',
        keywords: [
            'scautismo per ragazzi', 'scoutismo per ragazzi', 'scouting for boys', 
            'chiacchierate al fuoco', 'brownsea', 'primo libro', '1908', 'ragazzi', 
            'chiacchierata', 'libro fondamentale', 'testo sacro'
        ],
        category: 'bp_books',
        summary: 'Il libro fondamentale e fondatore dello scautismo, scritto da Robert Baden-Powell nel 1908.',
        content: `📖 **SCAUTISMO PER RAGAZZI (1908)**:
È l'opera fondamentale scritta da Robert Baden-Powell, divisa in 26 "chiacchierate al fuoco da campo". 

I temi chiave includono:
* **Legge e Promessa Scout**: I cardini morali del movimento.
* **Tecniche di Campismo e Vita all'aperto**: Pionierismo, nodi, cucina alla trappola, orientamento e osservazione.
* **Salvataggio e Pronto Soccorso**: Come rendersi utili in caso di incidenti, incendi o annegamenti.
* **Cittadinanza e Fratellanza Mondiale**: Lo scout come cittadino operoso e amico di tutti.

*B-P lo scrisse dopo il primo campo sperimentale sull'isola di Brownsea (1907) per trasmettere il metodo a ragazzi e capi.* ⚜️`
    },
    {
        id: 'libro_dei_capi',
        title: 'Il Libro dei Capi (Aids to Scoutmastership) - Baden-Powell',
        keywords: [
            'libro dei capi', 'libro dei capi scout', 'aids to scoutmastership', 
            'capi', 'capo scout', 'educazione capi', 'caporeparto', '1919', 
            'master', 'scoutmaster', 'servire'
        ],
        category: 'bp_books',
        summary: 'La guida metodologica per i capi adulti sull\'arte di educare i ragazzi secondo il metodo scout.',
        content: `📖 **IL LIBRO DEI CAPI (1919)**:
Dedicato da Baden-Powell agli adulti che guidano i ragazzi. B-P vi racchiude l'essenza del ruolo del Capo:

* **Il Capo come Fratello Maggiore**: Non deve comportarsi come un maestro di scuola o un comandante militare, ma deve mettersi sul piano del ragazzo per capirlo ed essere sua guida amichevole.
* **Il Sistema delle Squadriglie**: La squadriglia è il vero nucleo educativo. Delegare la responsabilità ai ragazzi (in particolare ai Capi Squadriglia) è fondamentale.
* **Auto-educazione**: Il ragazzo impara facendo (*learning by doing*) e si educa da solo scoprendo le proprie attitudini; il capo fornisce solo l'ambiente e lo stimolo adatti.

*È il pilastro per chiunque ricopra un servizio in Comunità Capi.* ⚜️`
    },
    {
        id: 'strada_verso_il_successo',
        title: 'La Strada verso il Successo (Rovering to Success) - Baden-Powell',
        keywords: [
            'strada verso il successo', 'rovering to success', 'giovani', 'scogli', 
            'canoa', '1922', 'rover', 'scolte', 'scelta', 'adulto', 'scoglio'
        ],
        category: 'bp_books',
        summary: 'Il libro guida per la branca Rover/Scolte, basato sulla metafora del navigare la propria canoa.',
        content: `📖 **LA STRADA VERSO IL SUCCESSO (1922)**:
Scritto da B-P per i ragazzi più grandi (Rover e Scolte) che si affacciano all'età adulta. 

Utilizza la metafora del **viaggio in canoa** in cui il giovane deve governare il proprio timone per evitare 5 "scogli" principali della vita:
1. **Il Gioco d'azzardo**: Evitare di cercare scorciatoie finanziarie basate sulla fortuna.
2. **L'Alcol e il Fumo**: Manutenere il corpo pulito e in salute.
3. **Le Donne (relazioni superficiali)**: Promuovere un amore sincero, cavalleresco e fedele.
4. **I Ciarlatani (dogmatismo/politica cieca)**: Sviluppare il pensiero critico e la propria fede personale.
5. **L'Irreligione**: Riconoscere la bellezza del Creato e amare il prossimo.

*L'invito cardine di B-P è: "Guida da te la tua canoa!"* 🥾`
    },
    {
        id: 'guida_da_te_la_tua_canoa',
        title: 'Guida da te la tua Canoa (Paddle Your Own Canoe) - Baden-Powell',
        keywords: [
            'guida da te la tua canoa', 'paddle your own canoe', 'canoa', 'timone', 
            'indipendenza', 'carattere', 'autoeducazione', '1930', 'canoista'
        ],
        category: 'bp_books',
        summary: 'Una raccolta di saggi di B-P sullo sviluppo dell\'indipendenza personale e del carattere dei giovani.',
        content: `📖 **GUIDA DA TE LA TUA CANOA (1930)**:
Questo libro raccoglie le conversazioni e gli scritti di Baden-Powell sull'importanza dell'indipendenza personale:

* **Sviluppo del Carattere**: B-P sostiene che la vera forza di uno scout risiede nella sua capacità di pensare con la propria testa e di agire secondo la propria coscienza.
* **Autoeducazione Energetica**: Lo scopo del metodo scout non è versare nozioni dentro la testa del ragazzo, ma tirare fuori le sue qualità uniche facendolo agire.
* **La Felicità nel Servizio**: La felicità non deriva dalla ricchezza o dal successo egoistico, ma dal rendere felici gli altri attraverso il servizio attivo.

*È una lettura fondamentale per capire l'approccio educativo scout volto alla responsabilità personale.* 🛶`
    },
    {
        id: 'taccuino_scout',
        title: 'Taccuino Scout (La mia vita da scout) - Baden-Powell',
        keywords: [
            'taccuino scout', 'taccuino di bp', 'la mia vita da scout', 
            'autobiografia bp', 'messaggio d addio', 'messaggio d\'addio', 'addio', 
            'ultimo messaggio', 'citazioni bp', 'aneddoti bp'
        ],
        category: 'bp_books',
        summary: 'Diario e scritti autobiografici con i pensieri personali più intimi e l\'ultimo messaggio di B-P.',
        content: `📖 **TACCUINO SCOUT / LA MIA VITA DA SCOUT**:
Una raccolta degli scritti personali, dei diari e degli appunti redatti da B-P durante la sua vita avventurosa.

Punti salienti:
* **Il Messaggio d'Addio**: Trovato tra le sue carte dopo la sua morte (1941), contiene la celebre frase: *"Cercate di lasciare questo mondo un po' migliore di quanto non l'avete trovato"*.
* **Contemplazione della Natura**: Riflessioni profonde sulla natura come prima cattedrale per conoscere Dio e se stessi.
* **Fratellanza mondiale**: Appunti sull'importanza dei Jamboree (i raduni mondiali) per superare i confini nazionali e prevenire le guerre.

*Una risorsa imperdibile per cogliere la spiritualità e la saggezza di Baden-Powell.* 📜`
    },

    // MANUALI DI BRANCA AGESCI
    {
        id: 'manuale_lc',
        title: 'Manuale della Branca L/C (Lupetti e Coccinelle) - AGESCI',
        keywords: [
            'manuale lc', 'branca lc', 'lupetti', 'coccinelle', 'giungla', 'bosco', 
            'famiglia felice', 'pista', 'volo', 'specialita', 'promessa lc', 
            'zampa tenera', 'stella', 'l/c', 'mowgli', 'bagheera', 'baloo', 'seeonee'
        ],
        category: 'manuali_agesci',
        summary: 'Il manuale ufficiale AGESCI per la branca dei bambini dagli 8 agli 11/12 anni.',
        content: `🍀 **MANUALE BRANCA L/C (8-11 anni)**:
Il cammino dei Lupetti (Branco) e delle Coccinelle (Cerchio) si basa sul **gioco** e su un **Ambiente Fantastico** ben definito:

* **Lupetti**: Vivono l'ambiente del *Libro della Giungla* di Kipling. I capi prendono il nome dei vecchi lupi saggisti (Akela, Bagheera, Baloo, Kaa). La progressione è scandita dalle tappe: *Zampa Tenera*, *Prima Stella*, *Seconda Stella*.
* **Coccinelle**: Vivono nel *Bosco del Mulino*. La progressione personale passa per i sentieri: *Prato*, *Bosco*, *Montagna*.
* **Punti Chiave**:
  * **La Promessa L/C**: Impegno a "fare del proprio meglio".
  * **La Legge del Branco**: *"Il Lupetto pensa all'altro / Il Lupetto ascolta il Vecchio Lupo"*.
  * **Le Specialità**: Badge individuali per coltivare le proprie abilità personali.

*La branca L/C punta alla socializzazione, all'autonomia pratica e alla gioia del gioco condiviso.* 🐾`
    },
    {
        id: 'manuale_eg',
        title: 'Manuale della Branca E/G (Esploratori e Guide) - AGESCI',
        keywords: [
            'manuale eg', 'branca eg', 'esploratori', 'guide', 'squadriglia', 
            'reparto', 'avventura', 'impresa', 'tappe eg', 'brevetto', 'e/g',
            'capo squadriglia', 'competenza', 'responsabilita', 'scoperta'
        ],
        category: 'manuali_agesci',
        summary: 'Il manuale ufficiale AGESCI per la branca dei ragazzi dagli 11/12 ai 16 anni.',
        content: `⛺ **MANUALE BRANCA E/G (12-16 anni)**:
La branca Esploratori e Guide si fonda sull'**Avventura**, sulla **vita all'aperto** e sul protagonismo dei ragazzi nel **Reparto**:

* **La Squadriglia**: Gruppo autonomo e monosessuale di 6-8 ragazzi guidato dal Capo Squadriglia. Ciascuno ha un ruolo (segretario, cambusiere, cassa, topografo).
* **Progressione Personale**: Il sentiero è diviso in 4 Tappe:
  1. *Scoperta* (ingresso in reparto).
  2. *Competenza* (sviluppo delle abilità tecniche).
  3. *Responsabilità* (servizio e guida degli altri).
  4. *Animazione* (condivisione e animazione del reparto).
* **Impresa**: È il motore delle attività. La squadriglia (o il reparto) progetta, organizza e realizza una grande avventura (es: costruzione di una zattera, esplorazione di una grotta, animazione sociale).
* **Specialità e Brevetti**: Le specialità individuali e i brevetti di competenza certificano le abilità tecniche acquisite.

*Il motto della branca è "Sii Preparato" (Be Prepared).* 🧭`
    },
    {
        id: 'manuale_rs',
        title: 'Manuale della Branca R/S (Rover e Scolte) - AGESCI',
        keywords: [
            'manuale rs', 'branca rs', 'rover', 'scolte', 'noviziato', 'clan', 
            'fuoco', 'strada', 'comunita', 'servizio', 'carta di clan', 'partenza scout', 
            'r/s', 'partenza', 'scelta politica', 'scelta di fede'
        ],
        category: 'manuali_agesci',
        summary: 'Il manuale ufficiale AGESCI per la branca dei giovani dai 16/17 ai 20/21 anni.',
        content: `🥾 **MANUALE BRANCA R/S (17-21 anni)**:
La branca Rover e Scolte accompagna i ragazzi verso l'età adulta e la cittadinanza attiva attraverso tre pilastri:

* **Strada**: Cammino a piedi, fatica fisica ed essenzialità. Lo zaino in spalla rappresenta la capacità di portare le proprie responsabilità.
* **Comunità**: Il Clan/Fuoco è il luogo del confronto, della crescita comune e della condivisione delle scelte.
* **Servizio**: Impegno gratuito e continuativo verso chi ha bisogno (all'interno del gruppo come capi L/C o E/G, o in associazioni esterne).
* **Strumenti Chiave**:
  * **Noviziato**: Il primo anno di transizione dal reparto.
  * **Carta di Clan**: La costituzione scritta redatta e firmata dal Clan.
  * **La Partenza**: L'atto formale con cui lo scout diventa adulto, completando il suo cammino formativo e promettendo di vivere secondo i valori scout nella società.

*Il cammino R/S forma cristiani consapevoli e cittadini responsabili.* 🎒`
    },

    // FIORDALISO PUBLISHER
    {
        id: 'editrice_fiordaliso',
        title: 'Editrice Fiordaliso - La Casa Editrice AGESCI',
        keywords: [
            'editrice fiordaliso', 'fiordaliso', 'libri scout', 'casa editrice scout', 
            'pubblicazioni fiordaliso', 'agesci libri', 'fiordaliso editrice', 
            'riviste scout', 'scout rivista'
        ],
        category: 'fiordaliso',
        summary: 'La casa editrice dell\'AGESCI che pubblica manuali, riviste e la letteratura ufficiale scout italiana.',
        content: `⚜️ **EDITRICE FIORDALISO**:
È la cooperativa editoriale ufficiale dell'AGESCI, attiva sin dalla nascita dell'associazione. Pubblica e distribuisce il materiale educativo e formativo scout:

* **Manuali Metodologici**: I libri di branca (L/C, E/G, R/S), i manuali per capi e le guide per squadriglie.
* **Opere di Baden-Powell**: Le traduzioni autorizzate in lingua italiana di tutti i testi del fondatore.
* **Riviste Associative**: Stampa e distribuisce testate storiche come *Scout* (per i capi), *Giochiamo* (per Lupetti/Coccinelle) e *Servire* (per Rover/Scolte).
* **Sussidi Tecnici**: Quaderni di caccia, agende scout, libri di canti, guide per la catechesi e materiale per l'animazione.

*Fiordaliso ha il compito cruciale di custodire e diffondere il patrimonio culturale e pedagogico scout in Italia.* 📖`
    },

    // SMALL TALK
    {
        id: 'st_saluti',
        title: 'Saluti & Accoglienza',
        keywords: [
            'ciao', 'buongiorno', 'buonasera', 'buona caccia', 'salut', 'hey', 'hello', 
            'accovacciati', 'come stai', 'come va', 'tutto bene', 'fratellino', 'akela'
        ],
        category: 'small_talk',
        summary: 'Saluti di cortesia a tema scout.',
        content: `🐺 *Buona caccia, fratellino!* 

Io sto benissimo, accovacciato vicino alla rupe ad osservare il sentiero della nostra Comunità Capi. E tu come stai? 

Sei pronto a metterti in marcia sul sentiero digitale di Orme oggi? Dimmi pure se vuoi fare verbali, cercare ditte pullman, mappare luoghi o fare domande scout! 🐾`
    },
    {
        id: 'st_identita',
        title: 'Chi sei / Chi è Akela',
        keywords: [
            'chi sei', 'cosa sei', 'presentati', 'tuo nome', 'ti chiami', 
            'parlami di te', 'cosa fai', 'chi e akela', 'storia di akela'
        ],
        category: 'small_talk',
        summary: 'Descrizione dell\'identità e dei compiti di Akela.',
        content: `🐺 Sono **Akela**, il vecchio e saggio lupo solitario che guida il Branco della Rupe di Seeonee nei racconti scout del Libro della Giungla.

Qui su Orme sono il tuo assistente virtuale! Il mio compito è aiutarti ad esplorare l'applicazione o a rispolverare la conoscenza scout. 

Chiedimi di navigare ad una sezione (es: *"voglio scrivere un verbale"*, *"aggiungiamo un campo"*) o fammi una domanda sullo scautismo! ⚜️`
    },
    {
        id: 'st_creatore',
        title: 'Chi ti ha creato / Origine',
        keywords: [
            'chi ti ha creato', 'chi ti ha fatto', 'creatore', 'creata', 'fatto', 'sviluppatore', 
            'programmatore', 'creatori di akela', 'chi ti ha programmato', 'sviluppatori'
        ],
        category: 'small_talk',
        summary: 'Informazioni sugli sviluppatori di Akela.',
        content: `🐺 Sono stato ideato e programmato con cura dai Capi della Comunità Capi di Orme. 

Mi hanno dotato di una mappa mentale scout e di un motore semantico per capirti in tempo reale su qualsiasi dispositivo mobile o computer! 💻⚜️`
    },
    {
        id: 'st_funzioni',
        title: 'Cosa puoi fare / Aiuto',
        keywords: [
            'cosa puoi fare', 'cosa fai', 'a cosa servi', 'come mi aiuti', 'funzioni', 
            'aiuto', 'aiutami', 'tutor', 'guid', 'manual', 'com usare'
        ],
        category: 'small_talk',
        summary: 'Guida rapida ai comandi e alle funzioni di Akela.',
        content: `🐺 Ti guido io su ogni sentiero dell'app! Ecco alcuni comandi rapidi che capisco al volo:
* 📍 *"Voglio collaborare ad allargare i luoghi"* (ti porta alla pagina \`/add\`)
* 🗺️ *"Mostrami la mappa dei campi"* (ti porta alla Home \`/\`)
* 📝 *"Devo compilare il verbale di oggi"* (ti porta a \`/verbali/nuovo\`)
* 📁 *"Fammi leggere i vecchi verbali"* (ti porta a \`/verbali\`)
* 🚌 *"Dobbiamo noleggiare un pullman per l'uscita"* (apre la rubrica trasporti \`/?transport=true\`)
* 🏆 *"Quanti punti ho in classifica?"* (ti porta a \`/leaderboard\`)
* 📋 *"Apri la lista d'attesa dei bambini"* (ti porta a \`/lista-attesa\`)
* ⚙️ *"Modifica le mie notifiche"* (ti porta a \`/settings\`)

*Chiedimi quello che ti passa per la testa!* 🐾`
    },
    {
        id: 'st_ringraziamenti',
        title: 'Ringraziamenti',
        keywords: [
            'grazie', 'grazie mille', 'ti ringrazio', 'gentilissimo', 'bravo', 
            'ottimo', 'super', 'grande', 'mitico', 'sei il migliore'
        ],
        category: 'small_talk',
        summary: 'Risposta calorosa ai ringraziamenti.',
        content: `🐺 Di nulla, fratellino! 

Servire ed aiutare il prossimo con gioia è uno dei primi doveri di ogni scout. 

*Buon cammino sul sentiero di Orme!* Se hai bisogno di altro, sono sempre qui pronto ad ascoltarti. 🐾`
    },
    {
        id: 'st_meteo',
        title: 'Meteo / Clima scout',
        keywords: [
            'meteo', 'tempo', 'tempo fa', 'piove', 'freddo', 'caldo', 'pioggia', 'neve', 'sole'
        ],
        category: 'small_talk',
        summary: 'Il celebre aforisma di B-P sul meteo.',
        content: `🐺 Ricorda sempre le celebri parole del nostro fondatore Baden-Powell:
> *"Non esiste buono o cattivo tempo, ma solo buono o cattivo equipaggiamento!"* 🌧️☀️

Prepara bene lo zaino, metti sempre in cima la mantellina per la pioggia ed un cambio asciutto, e sarai pronto ad affrontare qualsiasi sentiero! 🎒`
    }
];

// Helper to remove accents, punctuation and lowercase text
export function cleanText(text: string): string {
    return text.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ") // replace punctuation with spaces
        .replace(/\s+/g, " ") // shrink multiple spaces
        .trim();
}

// Levenshtein Distance implementation
export function getLevenshteinDistance(a: string, b: string): number {
    const tmp: number[][] = [];
    let i, j;
    for (i = 0; i <= a.length; i++) {
        tmp[i] = [i];
    }
    for (j = 0; j <= b.length; j++) {
        tmp[0][j] = j;
    }
    for (i = 1; i <= a.length; i++) {
        for (j = 1; j <= b.length; j++) {
            tmp[i][j] = Math.min(
                tmp[i - 1][j] + 1, // deletion
                tmp[i][j - 1] + 1, // insertion
                tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
            );
        }
    }
    return tmp[a.length][b.length];
}

// Typo-tolerant fuzzy matcher for words
export function isFuzzyMatch(word1: string, word2: string): boolean {
    if (word1 === word2) return true;
    
    // For very short words, require exact match
    if (word1.length <= 3 || word2.length <= 3) {
        return false;
    }
    
    // For short-medium words, allow 1 typo
    if (word1.length <= 5 || word2.length <= 5) {
        return getLevenshteinDistance(word1, word2) <= 1;
    }
    
    // For medium-long words, allow up to 2 typos
    if (word1.length <= 8 || word2.length <= 8) {
        return getLevenshteinDistance(word1, word2) <= 2;
    }
    
    // For long words, allow up to 3 typos
    return getLevenshteinDistance(word1, word2) <= 3;
}

// Italian stop words to filter out before matching tokens
const italianStopWords = new Set([
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 
    'con', 'su', 'per', 'tra', 'fra', 'e', 'o', 'ed', 'ad', 'al', 'ai', 'del', 'dei', 
    'della', 'delle', 'sul', 'sulla', 'sulle', 'nei', 'nella', 'nelle', 'questo', 
    'questa', 'quelli', 'quelle', 'che', 'chi', 'cosa', 'come', 'dove', 'quando', 
    'perche', 'quanti', 'quanta', 'scritto', 'parla', 'libro', 'manuale', 'libri',
    'manuali', 'agesci', 'robert', 'parlami', 'raccontami',
    'dimmi', 'spiegami', 'sapresti', 'dire', 'qualcosa', 'riguardo', 'suo', 'sua'
]);

// Semantic Matcher with fuzzy typo matching
export function matchScoutKnowledge(query: string): ScoutArticle | null {
    const cleaned = cleanText(query);
    if (!cleaned) return null;

    // Tokenize query
    const queryTokens = cleaned.split(' ').filter(token => token.length > 1 && !italianStopWords.has(token));
    if (queryTokens.length === 0) return null;

    let bestArticle: ScoutArticle | null = null;
    let highestScore = 0;

    for (const article of scoutKnowledgeBase) {
        let score = 0;

        // 1. Check direct matches of article keywords in query
        for (const kw of article.keywords) {
            const cleanKw = cleanText(kw);
            if (cleaned.includes(cleanKw)) {
                // Large boost if a full keyword expression is contained in the query
                score += cleanKw.split(' ').length * 3.5;
            }
        }

        // 2. Token overlap matches with fuzzy tolerance
        for (const queryToken of queryTokens) {
            for (const kw of article.keywords) {
                const cleanKw = cleanText(kw);
                const kwTokens = cleanKw.split(' ');
                
                for (const kwt of kwTokens) {
                    if (kwt === queryToken) {
                        score += 3; // Exact word match
                    } else if (isFuzzyMatch(kwt, queryToken)) {
                        const distance = getLevenshteinDistance(kwt, queryToken);
                        score += Math.max(1, 3 - (distance * 0.8)); // Add score based on similarity
                    }
                }
            }
        }

        // 3. Category match boost
        if (article.category === 'bp_books' && (cleaned.includes('libro') || cleaned.includes('libri') || cleaned.includes('scritto da') || cleaned.includes('scritti'))) {
            score += 1.5;
        }
        if (article.category === 'manuali_agesci' && (cleaned.includes('manuale') || cleaned.includes('manuali') || cleaned.includes('branca'))) {
            score += 1.5;
        }
        if (article.category === 'fiordaliso' && (cleaned.includes('editrice') || cleaned.includes('editore') || cleaned.includes('casa editrice'))) {
            score += 1.5;
        }

        // Track highest score
        if (score > highestScore) {
            highestScore = score;
            bestArticle = article;
        }
    }

    // Require a minimum threshold score of 3.5 to prevent false matches
    return highestScore >= 3.5 ? bestArticle : null;
}
