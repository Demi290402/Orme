export interface ScoutArticle {
    id: string;
    title: string;
    keywords: string[];
    category: 'bp_books' | 'manuali_agesci' | 'fiordaliso' | 'dizionario';
    summary: string;
    content: string;
}

export const scoutKnowledgeBase: ScoutArticle[] = [
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

// Italian stop words to filter out before matching tokens
const italianStopWords = new Set([
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 
    'con', 'su', 'per', 'tra', 'fra', 'e', 'o', 'ed', 'ad', 'al', 'ai', 'del', 'dei', 
    'della', 'delle', 'sul', 'sulla', 'sulle', 'nei', 'nella', 'nelle', 'questo', 
    'questa', 'quelli', 'quelle', 'che', 'chi', 'cosa', 'come', 'dove', 'quando', 
    'perche', 'quanti', 'quanta', 'scritto', 'parla', 'libro', 'manuale', 'libri',
    'manuali', 'agesci', 'bp', 'baden', 'powell', 'robert', 'parlami', 'raccontami',
    'dimmi', 'spiegami', 'sapresti', 'dire', 'qualcosa', 'riguardo', 'suo', 'sua'
]);

// Semantic Matcher
export function matchScoutKnowledge(query: string): ScoutArticle | null {
    const cleaned = cleanText(query);
    if (!cleaned) return null;

    // Tokenize
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
                score += cleanKw.split(' ').length * 3;
            }
        }

        // 2. Token overlap matches
        for (const token of queryTokens) {
            for (const kw of article.keywords) {
                const cleanKw = cleanText(kw);
                const kwTokens = cleanKw.split(' ');
                
                for (const kwt of kwTokens) {
                    if (kwt === token) {
                        score += 2; // Exact token match
                    } else if (kwt.length > 4 && token.length > 4 && (kwt.includes(token) || token.includes(kwt))) {
                        score += 1; // Fuzzy token match
                    }
                }
            }
        }

        // 3. Category match boost
        if (article.category === 'bp_books' && (cleaned.includes('libro') || cleaned.includes('libri') || cleaned.includes('scritto da bp') || cleaned.includes('scritti di bp'))) {
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

    // Require a minimum threshold score of 4 to prevent false positives
    return highestScore >= 4 ? bestArticle : null;
}
