import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Sparkles, AlertTriangle, RefreshCw, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { matchScoutKnowledge } from '@/lib/scoutKnowledge';

interface Message {
    id: string;
    sender: 'akela' | 'user';
    text: string;
    isSystem?: boolean;
}

// Window AI Types
interface WindowAI {
    languageModel?: {
        capabilities: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>;
        create: (options?: { systemPrompt?: string; temperature?: number }) => Promise<{
            prompt: (input: string) => Promise<string>;
            destroy: () => Promise<void>;
        }>;
    };
}

declare global {
    interface Window {
        ai?: WindowAI;
    }
}

export default function AkelaAssistant() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [userName, setUserName] = useState(() => localStorage.getItem('akela_user_name') || '');
    const [customDict, setCustomDict] = useState<Record<string, string>>(() => {
        try {
            return JSON.parse(localStorage.getItem('akela_custom_dict') || '{}');
        } catch {
            return {};
        }
    });
    const [pendingLearning, setPendingLearning] = useState<{ term: string; definition: string } | null>(null);

    // Gemini Nano status & Guide modal state
    const [geminiStatus, setGeminiStatus] = useState<'checking' | 'readily' | 'after-download' | 'no' | 'unsupported'>('checking');
    const [showGuide, setShowGuide] = useState(false);

    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // Dynamic greeting based on userName
    useEffect(() => {
        const nameGreeting = userName ? `Ciao, ${userName}! ` : 'Ciao! ';
        setMessages([
            {
                id: 'welcome',
                sender: 'akela',
                text: `${nameGreeting}Sono Akela, il vecchio lupo saggio di Orme. 🐺 Dimmi dove vuoi andare o chiedimi aiuto per imparare ad usare l'app! Cosa vuoi esplorare oggi?`
            }
        ]);
    }, [userName]);

    const checkGeminiStatus = async () => {
        if (typeof window === 'undefined' || !window.ai || !window.ai.languageModel) {
            setGeminiStatus('unsupported');
            return;
        }
        try {
            const caps = await window.ai.languageModel.capabilities();
            setGeminiStatus(caps.available);
        } catch (e) {
            console.error("Errore capabilities window.ai:", e);
            setGeminiStatus('no');
        }
    };

    useEffect(() => {
        checkGeminiStatus();
    }, []);

    // NLP Intent Parser
    const parseIntent = (text: string): { intent: string; reply: string; path?: string } => {
        const clean = text.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,""); // strip punctuation

        const has = (keywords: string[]) => keywords.some(k => clean.includes(k));

        // Name Learning Check
        const nameMatch = clean.match(/(?:mi chiamo|chiamami|il mio nome e)\s+([a-zA-Z0-9\s]+)/);
        if (nameMatch && nameMatch[1]) {
            const rawName = text.substring(text.toLowerCase().indexOf(nameMatch[1].toLowerCase())).trim();
            const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
            return {
                intent: 'learn_name',
                reply: `Ricevuto, fratellino! D'ora in poi ti chiamerò ${formattedName}. Felice di camminare insieme sullo stesso sentiero! 🐾`
            };
        }

        // Custom Dictionary verified learning check
        const learnKeywords = ['impara che', 'salva che', 'registra che'];
        const splitKeywords = [' significa ', ' e ', ' sta per '];
        let isLearningCmd = false;
        let learnKeywordUsed = '';
        
        for (const kw of learnKeywords) {
            if (clean.startsWith(kw)) {
                isLearningCmd = true;
                learnKeywordUsed = kw;
                break;
            }
        }

        if (isLearningCmd) {
            const originalTextNormalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            let splitIndex = -1;
            let splitKwUsed = '';
            for (const skw of splitKeywords) {
                const idx = originalTextNormalized.indexOf(skw);
                if (idx !== -1) {
                    splitIndex = idx;
                    splitKwUsed = skw;
                    break;
                }
            }

            if (splitIndex !== -1) {
                const startIndex = learnKeywordUsed.length;
                const rawTerm = text.substring(startIndex, splitIndex).trim();
                const rawDef = text.substring(splitIndex + splitKwUsed.length).trim();
                
                if (rawTerm && rawDef) {
                    const cleanTerm = rawTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
                    const protectedWords = ['coca', 'akela', 'legge', 'promessa', 'bp', 'baden powell', 'lupetti', 'esploratori', 'rover', 'scout', 'orme', 'verbali', 'luoghi', 'classifica', 'lista d\'attesa', 'trasporti'];
                    if (protectedWords.some(pw => cleanTerm === pw || cleanTerm.includes(pw))) {
                        return {
                            intent: 'learning_rejected',
                            reply: `Fratellino, il termine "${rawTerm}" è un pilastro fondamentale dello scautismo e dell'applicazione. Non posso alterarne il significato! 🌲`
                        };
                    }

                    return {
                        intent: 'learning_pending',
                        reply: `Capito! Vuoi che impari che "${rawTerm}" significa "${rawDef}"?`
                    };
                }
            }
        }

        const hasAll = (keywords: string[]) => keywords.every(k => clean.includes(k));

        // 1. Nuovo Luogo / Aggiunta Luoghi (Censimento)
        if (
            hasAll(['collabor', 'luogh']) || 
            hasAll(['allarg', 'luogh']) || 
            hasAll(['espand', 'luogh']) || 
            hasAll(['aggiung', 'luog']) || 
            hasAll(['sarebbe bello', 'luog']) || 
            hasAll(['nuov', 'camp']) || 
            hasAll(['mapp', 'cas']) || 
            hasAll(['inser', 'struttur']) || 
            has(['aggiungere un luogo', 'censire un luogo', 'nuova base scout', 'inserire una casa'])
        ) {
            return {
                intent: 'nuovo_luogo',
                reply: 'Che magnifica idea! Contribuire a censire e mappare nuovi luoghi, campi scout o case è uno dei servizi più utili per facilitare il cammino di tutto il gruppo. Ti reindirizzo alla pagina di inserimento di un nuovo luogo! 📍',
                path: '/add'
            };
        }

        // 2. Mappa / Visualizza Luoghi (Censimento)
        if (
            has(['luogh', 'camp', 'cas', 'post', 'struttur', 'bas', 'censi']) && 
            (has(['ved', 'mostr', 'cerc', 'trov', 'mapp', 'elenc', 'list', 'dove']) || clean.includes('esplor'))
        ) {
            return {
                intent: 'home_luoghi',
                reply: 'Ecco la pista! Ti mostro la mappa e l\'elenco completo di tutti i luoghi e i campi scout censiti. Puoi cercare per regione o filtrare per servizi e disponibilità di posti letto. Buona ricerca! 🗺️',
                path: '/'
            };
        }

        // 3. Nuovo Verbale
        if (
            hasAll(['scriv', 'verb']) || 
            hasAll(['compil', 'verb']) || 
            hasAll(['redig', 'verb']) || 
            hasAll(['nuov', 'verb']) || 
            hasAll(['crea', 'verb']) || 
            hasAll(['nuov', 'riun']) || 
            hasAll(['scriv', 'decision']) || 
            has(['voglio fare un verbale', 'registrare la riunione', 'nuovo verbale'])
        ) {
            return {
                intent: 'nuovo_verbale',
                reply: 'Certo! Mettere nero su bianco le scelte e le discussioni della Comunità Capi è fondamentale per la democrazia scout e la memoria del gruppo. Ti porto alla pagina per redigere un nuovo verbale! 📝',
                path: '/verbali/nuovo'
            };
        }

        // 4. Archivio / Lista Verbali
        if (
            has(['verb', 'riun', 'decision']) && 
            (has(['archiv', 'storico', 'list', 'cerc', 'legg', 'dove son', 'vecch', 'coca', 'co.ca.']) || clean.includes('document'))
        ) {
            return {
                intent: 'lista_verbali',
                reply: 'Ecco l\'archivio storico dei verbali del gruppo. Ti porto subito alla pagina dove potrai rileggere tutti i verbali passati, fare ricerche o estrarre i PDF. 📁',
                path: '/verbali'
            };
        }

        // 5. Classifica / Punti
        if (
            has(['classif', 'punt', 'puntegg', 'badg', 'medagl', 'leader', 'scout', 'capi']) &&
            (has(['chi e in testa', 'chi ha piu', 'quanti ho', 'vedere i', 'medaglie']) || has(['classifica', 'punteggi', 'leaderboard', 'badge']))
        ) {
            return {
                intent: 'classifica',
                reply: 'La pista si fa accesa! Ti reindirizzo alla classifica dei capi di Orme. Lì potrai vedere il punteggio di tutti, chi ha censito più luoghi o redatto più verbali, e i badge scout sbloccati. 🏆',
                path: '/leaderboard'
            };
        }

        // 6. Trasporti / Pullman (Redirige a Home con parametro ?transport=true)
        if (
            has(['trasp', 'pullm', 'autob', 'ditt', 'viagg', 'prev', 'bus', 'vettor', 'prezz']) ||
            hasAll(['cost', 'viagg']) ||
            hasAll(['preventiv', 'uscit'])
        ) {
            return {
                intent: 'trasporti',
                reply: 'Ottima idea! Ti porto subito alla sezione dei Trasporti Privati. Lì puoi consultare l\'anagrafica delle ditte di pullman, confrontare le tariffe e calcolare il preventivo esatto per la prossima uscita del tuo gruppo. 🚌',
                path: '/?transport=true'
            };
        }

        // 7. Lista d'Attesa
        if (
            has(['list', 'attes', 'iscr', 'ragazz', 'bambin', 'candid']) || 
            hasAll(['passagg', 'branc']) || 
            hasAll(['nuov', 'entrata'])
        ) {
            return {
                intent: 'lista_attesa',
                reply: 'Perfetto, ti reindirizzo alla Lista d\'Attesa. Lì trovi l\'elenco dei bambini e ragazzi iscritti esternamente, le richieste dei passaggi di branca e il link pubblico da inviare alle famiglie per le iscrizioni online. 📋',
                path: '/lista-attesa'
            };
        }

        // 8. Calendario / Eventi
        if (
            has(['calend', 'event', 'date', 'appunt', 'uscit', 'programm', 'attivita']) &&
            (has(['prossim', 'quando', 'ved', 'mostr', 'agenda']) || has(['calendario', 'uscite']))
        ) {
            return {
                intent: 'calendario',
                reply: 'Ecco il sentiero delle nostre attività! Ti porto subito al calendario del gruppo, dove potrai visualizzare le prossime uscite, i pernotti e gli eventi programmati. 📅',
                path: '/calendario'
            };
        }

        // 9. Inventario / Materiali
        if (
            has(['invent', 'attrezz', 'material', 'tend', 'pal', 'cucin', 'cambus']) || 
            hasAll(['quante', 'tend']) || 
            hasAll(['dove', 'tende'])
        ) {
            return {
                intent: 'inventario',
                reply: 'Apriamo le casse del materiale! Ti reindirizzo all\'Inventario di gruppo, dove teniamo traccia delle tende di reparto, dei pali, dell\'attrezzatura da cucina e di tutta la cambusa. ⛺',
                path: '/inventario'
            };
        }

        // 10. Bilancio / Cassa
        if (
            has(['bilanc', 'cass', 'sold', 'movim', 'spes', 'entrat', 'patrim']) || 
            hasAll(['quanti', 'sold']) || 
            hasAll(['rendicont', 'finanz'])
        ) {
            return {
                intent: 'bilancio',
                reply: 'Passiamo alla cassa del gruppo! Ti porto alla pagina del bilancio, dove potrai registrare entrate, uscite, quote delle attività e monitorare lo stato economico del gruppo scout. 💰',
                path: '/bilancio'
            };
        }

        // 11. Profilo
        if (
            has(['profil', 'mio', 'me', 'avatar', 'socio', 'dati']) || 
            hasAll(['chi', 'sono'])
        ) {
            return {
                intent: 'profilo',
                reply: 'Ecco il tuo angolo personale! Ti porto al tuo profilo socio, dove potrai rivedere la tua zona scout, il tuo iter formativo capi e l\'elenco completo delle medaglie e dei badge che hai conquistato. 👤',
                path: '/profile'
            };
        }

        // 12. Impostazioni
        if (
            has(['impost', 'sett', 'config', 'preferenz', 'scaric', 'notif', 'backup', 'export'])
        ) {
            return {
                intent: 'impostazioni',
                reply: 'Apriamo la cassetta degli attrezzi! Ti porto alle impostazioni dell\'applicazione, dove potrai configurare le notifiche push, definire i backup automatici ed esportare i dati del gruppo in Excel. ⚙️',
                path: '/settings'
            };
        }

        // 13. Guida / Aiuto
        if (has(['guid', 'aiut', 'tutor', 'help', 'com', 'usar', 'manual'])) {
            return {
                intent: 'guida',
                reply: 'Accovacciati intorno al fuoco! Sono Akela e ti spiego come esplorare Orme. ⛺ Clicca sui tasti rapidi qui sotto per scoprire i vari sentieri oppure chiedimi direttamente dove vuoi andare.'
            };
        }

        // 14. Deep Scout Knowledge Base Matcher (B-P books, Manuals, etc.)
        const scoutMatch = matchScoutKnowledge(text);
        if (scoutMatch) {
            return {
                intent: 'scout_knowledge',
                reply: scoutMatch.content
            };
        }

        // Direct fallback matching for short terms
        if (has(['coca', 'co.ca.'])) {
            return {
                intent: 'dict_coca',
                reply: 'CoCa sta per **Comunità Capi**. È l\'organo che unisce tutti i capi e gli assistenti ecclesiastici adulti (maggiori di 21 anni) di un Gruppo Scout. Si occupa della redazione del Progetto Educativo e della gestione dei singoli branchi, reparti e clan. ⚜️'
            };
        }
        if (has(['chi e akela', 'storia di akela', 'morte di akela', 'muore akela'])) {
            if (has(['muore', 'morte', 'quando'])) {
                return {
                    intent: 'dict_akela_morte',
                    reply: 'Akela, il vecchio e saggio lupo solitario del Libro della Giungla, muore nel racconto "I Cani Rossi" (Red Dog). Cade eroicamente difendendo il Branco dei lupi dall\'attacco dei dhole d\'Oriente. Muore cantando il suo ultimo canto di caccia accanto a Mowgli sulla Rupe della Pace. 🐺'
                };
            }
            return {
                intent: 'dict_akela',
                reply: 'Akela è il Grande Lupo Solitario che guida il Branco della Rupe di Seeonee nei racconti del Libro della Giungla di Kipling. Rappresenta la sapienza, l\'autorità benevola e la fedeltà alla Legge del Branco. Nelle branca Lupetti, è il capobranco dei capi scout.'
            };
        }

        // Custom User Dictionary Match
        const customKey = Object.keys(customDict).find(key => clean.includes(key));
        if (customKey) {
            return {
                intent: 'custom_dict_match',
                reply: `Ecco cosa ho imparato su "${customKey}":\n"${customDict[customKey]}" 📝`
            };
        }

        // Fallback
        return {
            intent: 'fallback',
            reply: 'Non sono sicuro di aver capito quale sentiero vuoi percorrere... 🌲 Prova a chiedermi cose come "scrivere un verbale", "vedere la classifica", "lista d\'attesa" o digita "aiuto" per il tutorial.'
        };
    };

    const handleSend = async (textToSend: string) => {
        if (!textToSend.trim()) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            sender: 'user',
            text: textToSend
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // If Gemini Nano is ready/readily available, run local LLM
        if (geminiStatus === 'readily' && window.ai?.languageModel) {
            try {
                const welcomeMsg = userName ? `L'utente si chiama ${userName}. ` : '';
                const session = await window.ai.languageModel.create({
                    systemPrompt: `Sei Akela, il saggio capobranco dei lupi di Seeonee dal Libro della Giungla.
Parli in italiano con un tono accogliente, fraterno e saggio, tipico di un vecchio capo scout. Usi termini come "fratellino", "buona caccia", "sul sentiero".
${welcomeMsg}Aiuti gli utenti a navigare nell'applicazione "Orme" e rispondi a domande sullo scautismo (CoCa, regolamenti, tradizioni, acronimi, racconti scout, libri di Baden-Powell, manuali delle branche AGESCI).
Se l'utente esprime l'intenzione di navigare in una pagina dell'applicazione, inserisci alla fine del messaggio ESATTAMENTE e solo alla fine il tag "[REDIRECT: /percorso]" (senza mostrare altre parentesi o codici all'utente) scegliendo tra:
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
- /settings (se vuole impostare preferenze o esportare dati)
- /?transport=true (se vuole aprire i Trasporti Privati o le ditte pullman)

Rispondi sempre in modo connesso, conciso (massimo 3-4 frasi) ed evita spiegazioni ridondanti sul redirect.`,
                    temperature: 0.6
                });

                const replyText = await session.prompt(textToSend);
                session.destroy();

                if (replyText) {
                    let finalReply = replyText;
                    let pathRedirect = '';
                    
                    const redirectMatch = replyText.match(/\[REDIRECT:\s*(.+?)\]/);
                    if (redirectMatch && redirectMatch[1]) {
                        pathRedirect = redirectMatch[1].trim();
                        finalReply = replyText.replace(/\[REDIRECT:\s*.+?\]/, '').trim();
                    }

                    const akelaMsg: Message = {
                        id: crypto.randomUUID(),
                        sender: 'akela',
                        text: finalReply
                    };

                    setMessages(prev => [...prev, akelaMsg]);
                    setIsTyping(false);
                    setPendingLearning(null);

                    if (pathRedirect) {
                        setTimeout(() => {
                            navigate(pathRedirect);
                            setIsOpen(false);
                        }, 1500);
                    }
                    return; // Successfully handled by Gemini Nano
                }
            } catch (err) {
                console.error("Gemini Nano Error, falling back to offline parser:", err);
            }
        }

        // Offline / Fallback Local NLP Parser
        setTimeout(() => {
            const parsed = parseIntent(textToSend);
            
            // Name Learning Hook
            if (parsed.intent === 'learn_name') {
                const cleanText = textToSend.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
                const nameMatch = cleanText.match(/(?:mi chiamo|chiamami|il mio nome e)\s+([a-zA-Z0-9\s]+)/);
                if (nameMatch && nameMatch[1]) {
                    const rawName = textToSend.substring(textToSend.toLowerCase().indexOf(nameMatch[1].toLowerCase())).trim();
                    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                    localStorage.setItem('akela_user_name', formattedName);
                    setUserName(formattedName);
                }
            }

            // Custom Learning Hook
            if (parsed.intent === 'learning_pending') {
                const cleanText = textToSend.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const learnKeywords = ['impara che', 'salva che', 'registra che'];
                const splitKeywords = [' significa ', ' e ', ' sta per '];
                
                let learnKeywordUsed = '';
                for (const kw of learnKeywords) {
                    if (cleanText.startsWith(kw)) {
                        learnKeywordUsed = kw;
                        break;
                    }
                }

                let splitIndex = -1;
                let splitKwUsed = '';
                for (const skw of splitKeywords) {
                    const idx = cleanText.indexOf(skw);
                    if (idx !== -1) {
                        splitIndex = idx;
                        splitKwUsed = skw;
                        break;
                    }
                }

                if (splitIndex !== -1) {
                    const startIndex = learnKeywordUsed.length;
                    const rawTerm = textToSend.substring(startIndex, splitIndex).trim();
                    const rawDef = textToSend.substring(splitIndex + splitKwUsed.length).trim();
                    
                    setPendingLearning({
                        term: rawTerm,
                        definition: rawDef
                    });
                }
            } else {
                setPendingLearning(null);
            }

            const akelaMsg: Message = {
                id: crypto.randomUUID(),
                sender: 'akela',
                text: parsed.reply
            };

            setMessages(prev => [...prev, akelaMsg]);
            setIsTyping(false);

            // Execute redirect if available
            if (parsed.path) {
                setTimeout(() => {
                    navigate(parsed.path!);
                    setIsOpen(false);
                }, 1500);
            }
        }, 800);
    };

    const triggerTutorialTopic = (topic: string, text: string) => {
        let replyText = '';
        switch (topic) {
            case 'campi':
                replyText = '📍 **SENTIERO CAMPI (Luoghi)**: In questa sezione trovi la mappa e l\'elenco di tutti i campi scout e le case censiti. Puoi cercare filtrando per posti letto, bagni o servizi. Per aggiungere un campo che conosci, usa il tasto "+" nella Home!';
                break;
            case 'verbali':
                replyText = '📝 **SENTIERO VERBALI & PRESENZE**: La sezione verbali ti permette di redigere e firmare i verbali di CoCa. Puoi inserire l\'ordine del giorno, le varie e tenere traccia delle presenze dello staff. Le presenze aggiornano le statistiche complessive!';
                break;
            case 'trasporti':
                replyText = '🚌 **SENTIERO TRASPORTI**: Nella rubrica trasporti trovi l\'elenco pubblico di tutte le ditte di pullman censite. Puoi contattarle rapidamente ed inserire i preventivi privati del tuo gruppo per stimare il costo a persona basandosi sugli ultimi prezzi.';
                break;
            case 'punti':
                replyText = '🏆 **SENTIERO CLASSIFICA & BADGE**: Ogni azione utile (come censire un luogo o compilare un verbale) ti fa guadagnare punti. Accumulando punti puoi salire di livello nella leaderboard di gruppo e sbloccare badge formativi scout!';
                break;
            case 'lista':
                replyText = '📋 **SENTIERO LISTA D\'ATTESA**: Puoi gestire i nuovi iscritti di tutte le branche in lista d\'attesa. C\'è anche un link pubblico che puoi condividere con i genitori per far compilare loro la richiesta direttamente online!';
                break;
            default:
                replyText = 'Scegli uno dei sentieri per scoprire come muoverti!';
        }

        const userMsg: Message = {
            id: crypto.randomUUID(),
            sender: 'user',
            text: text
        };

        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        setTimeout(() => {
            const akelaMsg: Message = {
                id: crypto.randomUUID(),
                sender: 'akela',
                text: replyText
            };
            setMessages(prev => [...prev, akelaMsg]);
            setIsTyping(false);
        }, 600);
    };

    return (
        <>
            {/* Floating Action Button (FAB) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-20 md:bottom-6 right-6 z-[60] flex items-center justify-center cursor-pointer transition-all duration-300 select-none outline-none border-none",
                    isOpen 
                        ? "bg-red-500 hover:bg-red-650 text-white p-3.5 rounded-full shadow-lg border-2 border-white dark:border-gray-800 rotate-90 scale-100 hover:scale-105 active:scale-95" 
                        : "bg-transparent shadow-none p-0 scale-100 hover:scale-110 active:scale-90 animate-wolf-float"
                )}
                title={isOpen ? "Chiudi Akela" : "Chiedi ad Akela"}
            >
                {isOpen ? <X size={20} /> : (
                    <div className="relative filter drop-shadow-md">
                        <span className="text-5xl md:text-6xl leading-none">🐺</span>
                        <div className="absolute top-1.5 right-1.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white dark:border-gray-900 animate-ping" />
                        <div className="absolute top-1.5 right-1.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white dark:border-gray-900" />
                    </div>
                )}
            </button>

            {/* Chat Drawer */}
            {isOpen && (
                <>
                    {/* Background Overlay for mobile */}
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 md:hidden" onClick={() => setIsOpen(false)} />
                    
                    <div className="fixed bottom-36 md:bottom-24 right-6 w-[340px] max-w-[90vw] h-[480px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 rounded-[2rem] shadow-2xl z-50 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom duration-200">
                        {/* Header */}
                        <div className="bg-scout-green dark:bg-scout-green-dark text-white p-4 flex items-center gap-3 shrink-0 transition-colors duration-200">
                            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-xl shadow-inner">
                                🐺
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm flex items-center gap-1.5 leading-tight">
                                    Akela 
                                    <span className="flex items-center gap-0.5 text-[9px] bg-yellow-400 text-gray-900 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                                        <Sparkles size={8} /> Guide
                                    </span>
                                </h3>
                                <p className="text-[10px] text-white/80 font-bold">Il tuo saggio assistente di branca</p>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="ml-auto p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Gemini Nano Status Alert Bar */}
                        {geminiStatus !== 'readily' && (
                            <div 
                                onClick={() => setShowGuide(true)}
                                className="bg-yellow-500/10 dark:bg-yellow-500/5 border-b border-yellow-500/20 px-4 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-yellow-500/15 transition-all group shrink-0"
                            >
                                <AlertTriangle size={12} className="text-yellow-600 dark:text-yellow-400 shrink-0 animate-pulse" />
                                <span className="text-[9px] font-black text-yellow-750 dark:text-yellow-400 flex-1 leading-tight group-hover:underline">
                                    {geminiStatus === 'after-download' 
                                        ? 'Chrome sta scaricando Gemini Nano localmente... Dettagli ⏳' 
                                        : 'Attiva Gemini Nano locale per risposte AI super intelligenti! ⚡'}
                                </span>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-950/20">
                            {messages.map(msg => (
                                <div 
                                    key={msg.id} 
                                    className={cn(
                                        "flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs transition-all animate-in fade-in duration-200",
                                        msg.sender === 'akela'
                                            ? "bg-white dark:bg-gray-850 text-gray-850 dark:text-gray-100 rounded-tl-xs border border-gray-100 dark:border-gray-800"
                                            : "bg-scout-green text-white rounded-tr-xs ml-auto"
                                    )}
                                >
                                    <p className="whitespace-pre-line font-medium">{msg.text}</p>
                                </div>
                            ))}
                            
                            {isTyping && (
                                <div className="bg-white dark:bg-gray-850 text-gray-400 rounded-2xl rounded-tl-xs p-3 text-xs max-w-[50px] flex items-center justify-center gap-1 border border-gray-100 dark:border-gray-800">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Action Chips (Tutorial) */}
                        <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex gap-1.5 overflow-x-auto whitespace-nowrap shrink-0 bg-white dark:bg-gray-900 scrollbar-none">
                            <button 
                                onClick={() => triggerTutorialTopic('campi', '📍 Sentiero Campi')} 
                                className="px-2.5 py-1.5 bg-scout-green/5 dark:bg-scout-green/10 border border-scout-green/20 text-scout-green rounded-full text-[10px] font-black hover:bg-scout-green/10 transition-colors"
                            >
                                📍 Luoghi
                            </button>
                            <button 
                                onClick={() => triggerTutorialTopic('verbali', '📝 Sentiero Verbali')} 
                                className="px-2.5 py-1.5 bg-scout-blue/5 dark:bg-scout-blue/10 border border-scout-blue/20 text-scout-blue rounded-full text-[10px] font-black hover:bg-scout-blue/10 transition-colors"
                            >
                                📝 Verbali
                            </button>
                            <button 
                                onClick={() => triggerTutorialTopic('trasporti', '🚌 Sentiero Trasporti')} 
                                className="px-2.5 py-1.5 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 text-purple-650 dark:text-purple-400 rounded-full text-[10px] font-black hover:bg-purple-500/10 transition-colors"
                            >
                                🚌 Trasporti
                            </button>
                            <button 
                                onClick={() => triggerTutorialTopic('punti', '🏆 Sentiero Classifica')} 
                                className="px-2.5 py-1.5 bg-yellow-500/5 dark:bg-yellow-500/10 border border-yellow-500/20 text-yellow-650 dark:text-yellow-500 rounded-full text-[10px] font-black hover:bg-yellow-500/10 transition-colors"
                            >
                                🏆 Classifica
                            </button>
                            <button 
                                onClick={() => triggerTutorialTopic('lista', '📋 Sentiero Lista Attesa')} 
                                className="px-2.5 py-1.5 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-full text-[10px] font-black hover:bg-red-500/10 transition-colors"
                            >
                                📋 Lista Attesa
                            </button>
                        </div>

                        {/* Learning Confirmation Overlay */}
                        {pendingLearning && (
                            <div className="p-3 bg-scout-green/10 dark:bg-emerald-950/20 border-t border-gray-150 dark:border-gray-800 flex flex-col gap-2 shrink-0 animate-in fade-in duration-200">
                                <p className="text-[10px] text-gray-700 dark:text-gray-300 font-bold leading-normal">
                                    Vuoi insegnarmi che <span className="text-scout-green-dark dark:text-scout-green-light">"{pendingLearning.term}"</span> significa <span className="font-medium italic">"{pendingLearning.definition}"</span>?
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updatedDict = {
                                                ...customDict,
                                                [pendingLearning.term.toLowerCase().trim()]: pendingLearning.definition
                                            };
                                            setCustomDict(updatedDict);
                                            localStorage.setItem('akela_custom_dict', JSON.stringify(updatedDict));
                                            
                                            const confirmationMsg: Message = {
                                                id: crypto.randomUUID(),
                                                sender: 'akela',
                                                text: `Ho imparato! Ho aggiunto "${pendingLearning.term}" alla mia mappa dei termini. 🐾`
                                            };
                                            setMessages(prev => [...prev, confirmationMsg]);
                                            setPendingLearning(null);
                                        }}
                                        className="flex-1 py-1.5 bg-scout-green dark:bg-scout-green-dark text-white text-[10px] font-black rounded-lg hover:opacity-90 active:scale-95 transition-all text-center cursor-pointer"
                                    >
                                        Conferma
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPendingLearning(null)}
                                        className="px-3 py-1.5 bg-gray-150 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-black rounded-lg hover:bg-gray-205 dark:hover:bg-gray-705 active:scale-95 transition-all cursor-pointer"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Input Area */}
                        <form 
                            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                            className="p-3 bg-white dark:bg-gray-900 border-t border-gray-150 dark:border-gray-800 flex gap-2 items-center shrink-0"
                        >
                            <input 
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Chiedi: 'Scrivi un verbale'..."
                                className="flex-1 px-3 py-2 border border-gray-250 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-950 text-xs font-bold outline-none focus:ring-1 focus:ring-scout-green dark:text-white"
                            />
                            <button 
                                type="submit"
                                disabled={!input.trim()}
                                className="p-2 bg-scout-green dark:bg-scout-green-dark text-white rounded-xl hover:bg-scout-green-dark transition-all disabled:opacity-40 disabled:scale-100 active:scale-95 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20"
                            >
                                <Send size={14} />
                            </button>
                        </form>
                    </div>
                </>
            )}

            {/* Guide Modal */}
            {showGuide && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-scout-green dark:bg-scout-green-dark p-4 text-white flex items-center gap-3 shrink-0">
                            <BookOpen size={20} />
                            <div>
                                <h3 className="font-extrabold text-sm leading-tight">Guida Attivazione AI</h3>
                                <p className="text-[9px] text-white/80 font-bold">Attiva Gemini Nano gratis sul tuo dispositivo</p>
                            </div>
                            <button 
                                onClick={() => setShowGuide(false)}
                                className="ml-auto p-1.5 hover:bg-white/10 rounded-full text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                            <div className="p-3 bg-scout-green/5 dark:bg-scout-green/10 border border-scout-green/10 rounded-xl space-y-1">
                                <p className="font-black text-[10px] text-scout-green uppercase tracking-wide">Cos'è Gemini Nano?</p>
                                <p className="text-[11px]">
                                    È il modello di intelligenza artificiale locale di Google. Funziona offline, in modo privato e 100% gratuito senza API o token!
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Procedura di attivazione:</p>
                                
                                <div className="flex gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-black shrink-0 text-[10px]">1</div>
                                    <div>
                                        <p className="font-bold">Verifica il Browser</p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Assicurati di usare Google Chrome (versione 127 o superiore) o un browser Chromium compatibile.</p>
                                    </div>
                                </div>

                                <div className="flex gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-black shrink-0 text-[10px]">2</div>
                                    <div>
                                        <p className="font-bold">Abilita il Modello locale</p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                            Apri una scheda su <code className="bg-gray-100 dark:bg-gray-950 px-1 py-0.5 rounded font-mono text-[10px]">chrome://flags/#optimization-guide-on-device-model</code> ed impostalo su <strong className="text-scout-green">Enabled BypassPerfRequirement</strong> (o Enabled).
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-black shrink-0 text-[10px]">3</div>
                                    <div>
                                        <p className="font-bold">Abilita le API Prompt</p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                            Apri una scheda su <code className="bg-gray-100 dark:bg-gray-950 px-1 py-0.5 rounded font-mono text-[10px]">chrome://flags/#prompt-api-for-gemini-nano</code> ed impostalo su <strong className="text-scout-green">Enabled</strong>.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-black shrink-0 text-[10px]">4</div>
                                    <div>
                                        <p className="font-bold">Riavvia Chrome</p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Clicca sul pulsante "Relaunch" in basso a destra per riavviare il browser e applicare le modifiche.</p>
                                    </div>
                                </div>

                                <div className="flex gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-black shrink-0 text-[10px]">5</div>
                                    <div>
                                        <p className="font-bold">Attendi il download</p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                            Chrome scaricherà Gemini Nano in background. Puoi controllare lo stato visitando <code className="bg-gray-100 dark:bg-gray-950 px-1 py-0.5 rounded font-mono text-[10px]">chrome://components</code> e controllando che "Optimization Guide On Device Model" sia scaricato ed aggiornato.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Check Status Widget */}
                            <div className="pt-3 border-t border-gray-100 dark:border-gray-850 flex flex-col gap-3">
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-955 p-2.5 rounded-xl border border-gray-100 dark:border-gray-850">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Stato Attuale</p>
                                        <p className="font-black text-xs mt-0.5">
                                            {geminiStatus === 'readily' && <span className="text-scout-green font-extrabold">🎉 Pronto ed Attivo!</span>}
                                            {geminiStatus === 'after-download' && <span className="text-yellow-650 dark:text-yellow-400 font-extrabold">⏳ In download...</span>}
                                            {geminiStatus === 'no' && <span className="text-red-500 font-extrabold">❌ Flag disattivate</span>}
                                            {geminiStatus === 'unsupported' && <span className="text-red-500 font-extrabold">❌ Browser non supportato</span>}
                                            {geminiStatus === 'checking' && <span className="text-gray-400 font-extrabold">🔄 Verifica in corso...</span>}
                                        </p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={checkGeminiStatus}
                                        className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 rounded-xl transition-all active:scale-90 flex items-center justify-center shrink-0 cursor-pointer"
                                        title="Riprova verifica"
                                    >
                                        <RefreshCw size={14} className={cn(geminiStatus === 'checking' && "animate-spin")} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-55/50 dark:bg-gray-950/40 border-t border-gray-100 dark:border-gray-800 flex gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowGuide(false)}
                                className="w-full py-2 bg-scout-green dark:bg-scout-green-dark text-white rounded-xl font-black text-center shadow-md shadow-emerald-500/10 cursor-pointer hover:opacity-90 active:scale-95 transition-all text-xs"
                            >
                                Ho capito, torna alla chat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
