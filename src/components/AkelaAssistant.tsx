import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    sender: 'akela' | 'user';
    text: string;
    isSystem?: boolean;
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

        // 1. Nuovo Verbale / Verbali Editor
        if (has(['verb', 'riun', 'coca', 'scriv', 'compil', 'ritorn', 'staff'])) {
            if (has(['nuov', 'scriv', 'compil', 'crea'])) {
                return {
                    intent: 'nuovo_verbale',
                    reply: 'Certo! Ti accompagno sul sentiero per redigere un nuovo verbale di CoCa. Ti sto reindirizzando... 📝',
                    path: '/verbali/nuovo'
                };
            }
            return {
                intent: 'lista_verbali',
                reply: 'Ti porto subito all\'archivio di tutti i verbali di CoCa. Lì potrai rileggere le decisioni passate. 📁',
                path: '/verbali'
            };
        }

        // 2. Luoghi
        if (has(['luogh', 'camp', 'post', 'struttur', 'censi'])) {
            if (has(['aggiung', 'inser', 'mapp', 'nuov'])) {
                return {
                    intent: 'nuovo_luogo',
                    reply: 'Molto bene! Espandiamo la mappa dei nostri Luoghi. Ti porto alla pagina per aggiungere un luogo. 📍',
                    path: '/add'
                };
            }
            return {
                intent: 'home_luoghi',
                reply: 'Ecco la mappa e la lista completa di tutti i luoghi e campi scout censiti. 🗺️',
                path: '/'
            };
        }

        // 3. Classifica / Punti
        if (has(['classif', 'punt', 'puntegg', 'badg', 'medagl', 'leader', 'scout'])) {
            return {
                intent: 'classifica',
                reply: 'Curioso di vedere chi sta compiendo più passi? Ecco la classifica dei capi e i badge sbloccati! 🏆',
                path: '/leaderboard'
            };
        }

        // 4. Trasporti
        if (has(['trasp', 'pullm', 'autob', 'ditt', 'viagg', 'prev', 'bus'])) {
            return {
                intent: 'trasporti',
                reply: 'Ti accompagno alla rubrica dei Trasporti Privati. Lì puoi confrontare i vettori e calcolare preventivi per i tuoi spostamenti. 🚌',
                path: '/settings'
            };
        }

        // 5. Lista d'Attesa
        if (has(['list', 'attes', 'iscr', 'ragazz', 'bambin', 'candid'])) {
            return {
                intent: 'lista_attesa',
                reply: 'Gestiamo le iscrizioni esterne e i passaggi di branca nella Lista d\'Attesa. Ti sto portando alla sezione dedicata. 📋',
                path: '/lista-attesa'
            };
        }

        // 6. Calendario
        if (has(['calend', 'event', 'date', 'appunt', 'uscit', 'programm'])) {
            return {
                intent: 'calendario',
                reply: 'Ecco la pista delle attività del gruppo. Ti reindirizzo al calendario degli eventi. 📅',
                path: '/calendario'
            };
        }

        // 7. Inventario
        if (has(['invent', 'attrezz', 'material', 'tend', 'pal', 'cucin', 'cambus'])) {
            return {
                intent: 'inventario',
                reply: 'Apriamo la cambusa! Ti porto all\'inventario degli attrezzi e dei materiali di gruppo. ⛺',
                path: '/inventario'
            };
        }

        // 8. Bilancio / Cassa
        if (has(['bilanc', 'cass', 'sold', 'movim', 'spes', 'entrat', 'patrim'])) {
            return {
                intent: 'bilancio',
                reply: 'Diamo un\'occhiata alla cassa di gruppo. Ti reindirizzo alla gestione del bilancio. 💰',
                path: '/bilancio'
            };
        }

        // 9. Impostazioni
        if (has(['impost', 'sett', 'config', 'preferenz', 'scaric', 'notif'])) {
            return {
                intent: 'impostazioni',
                reply: 'Ti porto alle impostazioni dell\'applicazione, dove puoi regolare notifiche ed esportare dati. ⚙️',
                path: '/settings'
            };
        }

        // 10. Profilo
        if (has(['profil', 'mio', 'me', 'avatar', 'socio'])) {
            return {
                intent: 'profilo',
                reply: 'Diamo uno sguardo al tuo profilo socio, ai tuoi badge e al tuo percorso formativo! 👤',
                path: '/profile'
            };
        }

        // 11. Guida / Aiuto / Tutorial
        if (has(['guid', 'aiut', 'tutor', 'help', 'com', 'usar', 'manual'])) {
            return {
                intent: 'guida',
                reply: 'Accovacciati intorno al fuoco! Sono Akela e ti spiego come esplorare Orme. ⛺ Clicca sui tasti rapidi qui sotto per scoprire i vari sentieri oppure chiedimi direttamente dove vuoi andare.'
            };
        }

        // Static Scout Dictionary matching
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
        if (has(['raccont', 'libro della giungla', 'giungla', 'kipling'])) {
            return {
                intent: 'dict_racconti',
                reply: 'I racconti di Mowgli tratti dal Libro della Giungla di Rudyard Kipling costituiscono l\'Ambiente Fantastico della branca Lupetti (L/C). Attraverso le storie di Mowgli, Baloo, Bagheera, Akela e Kaa, i bambini apprendono i valori fondamentali come il rispetto, la condivisione e l\'obbedienza alla Legge del Branco. 📖'
            };
        }
        if (has(['legge'])) {
            return {
                intent: 'dict_legge',
                reply: 'La Legge Scout (composta da 10 articoli) è la guida morale di ogni scout. Per i Lupetti e le Coccinelle la Legge recita:\n1. Il Lupetto pensa altrimenti / Il Lupetto ascolta il Vecchio Lupo;\n2. Il Lupetto non ascolta se stesso / Il Lupetto è sempre pulito e ordinato.\nPer la branca E/G e R/S, B-P scrisse la Legge Scout universale (es: "La Guida e lo Scout sono di parola", "si rendono utili e aiutano gli altri"). ⚜️'
            };
        }
        if (has(['promessa'])) {
            return {
                intent: 'dict_promessa',
                reply: 'La Promessa Scout è l\'atto con cui si sceglie consapevolmente di entrare nella fratellanza scout. Si recita così:\n"Con l\'aiuto di Dio prometto sul mio onore di fare del mio meglio:\n- Per compiere il mio dovere verso Dio e verso il mio Paese;\n- Per aiutare gli altri in ogni circostanza;\n- Per osservare la Legge scout." ⚜️'
            };
        }
        if (has(['bp', 'baden powell', 'fondatore'])) {
            return {
                intent: 'dict_bp',
                reply: 'Sir Robert Baden-Powell (chiamato affettuosamente B.-P.) è il fondatore dello Scautismo e del Guidismo. Nato a Londra il 22 febbraio 1857, era un generale dell\'esercito britannico. Ha fondato lo scautismo nel 1907 con il primo campo sperimentale sull\'isola di Brownsea. 🌍'
            };
        }
        if (has(['lupett', 'coccinell', ' lc '])) {
            return {
                intent: 'dict_lc',
                reply: 'La branca L/C (Lupetti e Coccinelle) accoglie i bambini e le bambine dagli 8 agli 11/12 anni. Il loro cammino si basa sul gioco, sulla gioia e sull\'Ambiente Fantastico (la Giungla per i Lupetti, il Bosco per le Coccinelle). 🐺🍀'
            };
        }
        if (has(['esplorator', 'guid', ' eg '])) {
            return {
                intent: 'dict_eg',
                reply: 'La branca E/G (Esploratori e Guide) accoglie ragazzi e ragazze dagli 11/12 ai 16 anni riuniti in Squadriglie e Reparto. La loro esperienza si basa sull\'Avventura, l\'Impresa e la vita all\'aperto (Campismo, Pionierismo e Topografia). ⛺🧭'
            };
        }
        if (has(['rover', 'scolt', ' rs '])) {
            return {
                intent: 'dict_rs',
                reply: 'La branca R/S (Rover e Scolte) accoglie giovani dai 16/17 ai 20/21 anni (Noviziato e Clan). I loro tre pilastri sono Strada (scoperta di sé e fatica), Comunità (condivisione) e Servizio (aiuto gratuito al prossimo). 🥾🎒'
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

        const apiKey = localStorage.getItem('akela_gemini_api_key') || '';

        // If API key is present, use Google Gemini AI
        if (apiKey) {
            try {
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

Se l'utente vuole insegnarti un nuovo termine (es: "impara che X significa Y"), rispondi dicendo che per insegnarti parole nuove deve temporaneamente rimuovere la chiave API dalle impostazioni per usare la modalità locale di apprendimento.
Mantieni le risposte connesse, concise (massimo 3-4 frasi), ed evita risposte troppo lunghe o ridondanti.`;

                // Map messages to Gemini API format
                const history = messages.slice(-8).map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                }));
                history.push({
                    role: 'user',
                    parts: [{ text: textToSend }]
                });

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: history,
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 350
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
                        return; // Successfully handled by Gemini
                    }
                }
            } catch (err) {
                console.error("Gemini API Error, falling back to offline parser:", err);
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
        </>
    );
}
