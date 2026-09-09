import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { matchScoutKnowledge, scoutKnowledgeBase } from '@/lib/scoutKnowledge';
import { getLocations } from '@/lib/data';
import { getVerbali } from '@/lib/verbali';
import { getEventi } from '@/lib/calendario';
import { getListaAttesa } from '@/lib/listaAttesa';
import { askAkelaBot, AIMessage } from '@/lib/ai';

interface Message {
    id: string;
    sender: 'akela' | 'user';
    text: string;
    isSystem?: boolean;
}


export default function AkelaAssistant() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
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
    const [lastTopic, setLastTopic] = useState<string | null>(null);
    const [pendingRedirect, setPendingRedirect] = useState<{ path: string; label: string } | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [dailyRemaining, setDailyRemaining] = useState<number>(() => {
        const saved = localStorage.getItem('akela_daily_remaining');
        const savedDate = localStorage.getItem('akela_daily_date');
        const today = new Date().toISOString().slice(0, 10);
        if (savedDate === today && saved !== null) {
            const parsed = Number(saved);
            return isNaN(parsed) ? 25 : parsed;
        }
        return 25;
    });
    const dailyMax = 25;
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // Handle Escape key to minimize or close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                if (isFullscreen) {
                    setIsFullscreen(false);
                } else {
                    setIsOpen(false);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isFullscreen]);

    // Dynamic random greeting based on userName
    useEffect(() => {
        const nameGreeting = userName ? `Ciao, ${userName}! ` : 'Ciao! ';
        const greetings = [
            `${nameGreeting}Sono Akela, il vecchio lupo saggio di Orme. 🐺 Dimmi dove vuoi andare o chiedimi aiuto per imparare ad usare l'app! Cosa vuoi esplorare oggi?`,
            `Buona caccia, ${userName || 'fratellino'}! Sono Akela. 🐾 Il sentiero è sgombro e pronto ad essere esplorato. Come posso aiutarti oggi?`,
            `Benvenuto alla rupe, ${userName || 'fratellino'}! Sono Akela. ⚜️ Sono qui pronto ad aiutarti con i verbali, la mappa o i trasporti. Dove ci incamminiamo?`
        ];
        const randomIndex = Math.floor(Math.random() * greetings.length);
        setMessages([
            {
                id: 'welcome',
                sender: 'akela',
                text: greetings[randomIndex]
            }
        ]);
    }, [userName]);

    const handleDatabaseSearch = async (cleanQuery: string, rawQuery: string): Promise<{ reply: string; path?: string } | null> => {
        const clean = cleanQuery.toLowerCase();
        const has = (keywords: string[]) => keywords.some(k => clean.includes(k));
        
        // Extract terms
        const stopwords = ['cerca', 'trova', 'quando', 'abbiamo', 'abbiam', 'c\'e', 'c\'è', 'dov\'e', 'dov\'è', 'dove', 'si', 'trova', 'l\'uscita', 'l\'evento', 'l\'incontro', 'il', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 'perche', 'come', 'chi', 'cosa'];
        
        const searchTerms = rawQuery.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"")
            .split(' ')
            .filter(t => t.length > 2 && !stopwords.includes(t));
            
        if (searchTerms.length === 0) return null;
        const searchTermStr = searchTerms.join(' ');

        const isQuantitative = has(['quanti', 'quante', 'numero', 'totale', 'conteggio', 'somma']);

        if (isQuantitative) {
            // A. LISTA ATTESA QUANTITY
            if (has(['bambin', 'iscrit', 'ragazz', 'figl', 'lista', 'attesa'])) {
                try {
                    setLastTopic('waitlist_quantity');
                    const lista = await getListaAttesa();
                    let filtered = lista;
                    let filterDesc = 'in totale';
                    
                    if (has(['lc', 'l/c', 'lupett', 'coccinell', 'elementar', 'primari'])) {
                        filtered = lista.filter(item => {
                            const cl = item.classe.toLowerCase();
                            return cl.includes('elem') || cl.includes('prim') || ['1a', '2a', '3a', '4a', '5a'].some(k => cl.includes(k));
                        });
                        filterDesc = 'della branca L/C (Lupetti e Coccinelle)';
                    } else if (has(['eg', 'e/g', 'esplorator', 'guid', 'medi'])) {
                        filtered = lista.filter(item => {
                            const cl = item.classe.toLowerCase();
                            return cl.includes('med') || ['1a media', '2a media', '3a media'].some(k => cl.includes(k));
                        });
                        filterDesc = 'della branca E/G (Esploratori e Guide)';
                    } else if (has(['rs', 'r/s', 'rover', 'scolt'])) {
                        filtered = lista.filter(item => {
                            const cl = item.classe.toLowerCase();
                            return cl.includes('rs') || cl.includes('rover') || cl.includes('scolt') || cl.includes('sup') || cl.includes('univ');
                        });
                        filterDesc = 'della branca R/S (Rover e Scolte)';
                    }
                    
                    const count = filtered.length;
                    return {
                        reply: `🐺 Ho controllato la lista d'attesa! Ci sono **${count}** bambini/ragazzi registrati ${filterDesc}.\n\nVuoi verificare l'elenco completo? [REDIRECT: /lista-attesa]`,
                        path: '/lista-attesa'
                    };
                } catch (e) {
                    console.error("Errore conteggio lista attesa:", e);
                }
            }

            // B. VERBALI QUANTITY
            if (has(['verbale', 'verbali', 'riunion'])) {
                try {
                    setLastTopic('verbali_quantity');
                    const verbali = await getVerbali();
                    let filtered = verbali;
                    let timeDesc = 'in totale';
                    
                    const yearMatch = clean.match(/\b(20\d{2})\b/);
                    if (yearMatch) {
                        const year = yearMatch[1];
                        filtered = verbali.filter(v => v.data && v.data.startsWith(year));
                        timeDesc = `nel ${year}`;
                    } else if (has(['anno scorso', 'anno passato', 'scorso anno'])) {
                        filtered = verbali.filter(v => v.data && v.data.startsWith('2025'));
                        timeDesc = `l'anno scorso (nel 2025)`;
                    } else if (has(['quest\'anno', 'anno in corso'])) {
                        filtered = verbali.filter(v => v.data && v.data.startsWith('2026'));
                        timeDesc = `quest'anno (nel 2026)`;
                    }
                    
                    const count = filtered.length;
                    return {
                        reply: `🐺 Ho esaminato l'archivio dei verbali! Risultano scritti **${count}** verbali di Comunità Capi ${timeDesc}.\n\nTi porto all'elenco dei verbali... [REDIRECT: /verbali]`,
                        path: '/verbali'
                    };
                } catch (e) {
                    console.error("Errore conteggio verbali:", e);
                }
            }

            // C. CALENDARIO QUANTITY
            if (has(['event', 'attivita', 'uscit', 'pernott', 'incontro', 'incontri', 'calendario'])) {
                try {
                    setLastTopic('calendario_quantity');
                    const eventi = await getEventi();
                    let filtered = eventi;
                    let branchDesc = 'complessivi';
                    let timeDesc = '';
                    
                    if (has(['lc', 'l/c', 'lupett', 'coccinell'])) {
                        filtered = filtered.filter(e => e.branca === 'L/C');
                        branchDesc = 'della branca L/C';
                    } else if (has(['eg', 'e/g', 'esplorator', 'guid'])) {
                        filtered = filtered.filter(e => e.branca === 'E/G');
                        branchDesc = 'della branca E/G';
                    } else if (has(['rs', 'r/s', 'rover', 'scolt'])) {
                        filtered = filtered.filter(e => e.branca === 'R/S');
                        branchDesc = 'della branca R/S';
                    } else if (has(['coca', 'co.ca.', 'capi'])) {
                        filtered = filtered.filter(e => e.branca === 'CoCa');
                        branchDesc = 'della Comunità Capi';
                    } else if (has(['gruppo'])) {
                        filtered = filtered.filter(e => e.branca === 'Gruppo');
                        branchDesc = 'di Gruppo';
                    }
                    
                    const yearMatch = clean.match(/\b(20\d{2})\b/);
                    if (yearMatch) {
                        const year = yearMatch[1];
                        filtered = filtered.filter(e => e.dataInizio && e.dataInizio.startsWith(year));
                        timeDesc = ` nel ${year}`;
                    } else if (has(['anno scorso', 'anno passato', 'scorso anno'])) {
                        filtered = filtered.filter(e => e.dataInizio && e.dataInizio.startsWith('2025'));
                        timeDesc = ` l'anno scorso (nel 2025)`;
                    } else if (has(['quest\'anno', 'anno in corso'])) {
                        filtered = filtered.filter(e => e.dataInizio && e.dataInizio.startsWith('2026'));
                        timeDesc = ` quest'anno (nel 2026)`;
                    }
                    
                    const count = filtered.length;
                    return {
                        reply: `🐺 Ho contato gli appuntamenti sul calendario! Ci sono **${count}** eventi ${branchDesc}${timeDesc} registrati.\n\nTi porto al calendario di gruppo... [REDIRECT: /calendario]`,
                        path: '/calendario'
                    };
                } catch (e) {
                    console.error("Errore conteggio calendario:", e);
                }
            }

            // D. LUOGHI QUANTITY
            if (has(['luogh', 'camp', 'cas', 'struttur', 'bas'])) {
                try {
                    setLastTopic('locations_quantity');
                    const locations = await getLocations();
                    let filtered = locations;
                    let filterDesc = 'in totale';
                    
                    const regions = ['lombardia', 'piemonte', 'liguria', 'toscana', 'veneto', 'emilia', 'lazio', 'campania', 'sicilia', 'sardegna', 'trentino', 'friuli', 'umbria', 'marche', 'abruzzo', 'molise', 'puglia', 'basilicata', 'calabria', 'valle d\'aosta', 'vda'];
                    const foundRegion = regions.find(r => clean.includes(r));
                    if (foundRegion) {
                        const regName = foundRegion === 'vda' ? "valle d'aosta" : foundRegion;
                        filtered = locations.filter(l => l.region.toLowerCase().includes(regName));
                        filterDesc = `nella regione ${regName.charAt(0).toUpperCase() + regName.slice(1)}`;
                    } else if (has(['posti letto', 'letto', 'dormire'])) {
                        filtered = locations.filter(l => l.beds && l.beds > 0);
                        filterDesc = 'con posti letto al coperto';
                    } else if (has(['tende', 'posti tenda', 'campeggio'])) {
                        filtered = locations.filter(l => l.hasTents);
                        filterDesc = 'con area attrezzata per posti tenda';
                    }
                    
                    const count = filtered.length;
                    return {
                        reply: `🐺 Ho scansionato la mappa delle Orme! Abbiamo **${count}** luoghi scout registrati ${filterDesc}.\n\nVuoi esplorarli sulla mappa? [REDIRECT: /]`,
                        path: '/'
                    };
                } catch (e) {
                    console.error("Errore conteggio luoghi:", e);
                }
            }
        }

        // 1. CALENDAR SEARCH (Intent: quando, data, ora, giorno, calendario, evento, uscita, riunione, attivita, impegno)
        if (has(['quando', 'data', 'ora', 'giorno', 'calendario', 'evento', 'uscita', 'riunione', 'attivita', 'impegno'])) {
            try {
                setLastTopic('calendario');
                const eventi = await getEventi();
                const matches = eventi.filter(e => {
                    const titleClean = e.titolo.toLowerCase();
                    const noteClean = (e.note || '').toLowerCase();
                    const luogoClean = (e.luogo || '').toLowerCase();
                    return searchTerms.some(term => titleClean.includes(term) || noteClean.includes(term) || luogoClean.includes(term));
                });
                
                if (matches.length > 0) {
                    const list = matches.slice(0, 3).map(e => 
                        `📅 **${e.titolo}**\n🗓️ Data: ${e.dataInizio}${e.oraInizio ? ` alle ore ${e.oraInizio}` : ''}\n📍 Luogo: ${e.luogo || 'Non indicato'}\n📝 Note: ${e.note || 'Nessuna nota'}`
                    ).join('\n\n');
                    return {
                        reply: `🐺 Ho fiutato la pista del calendario! Ecco cosa ho trovato:\n\n${list}\n\nSe vuoi vedere il calendario completo clicca qui. [REDIRECT: /calendario]`,
                        path: '/calendario'
                    };
                } else {
                    return {
                        reply: `🐺 Ho cercato lungo tutto il calendario di gruppo per "${searchTermStr}", ma non ho trovato alcun evento corrispondente. Se si tratta di un'attività in programma, puoi aggiungerla tu stesso al calendario! [REDIRECT: /calendario]`,
                        path: '/calendario'
                    };
                }
            } catch (err) {
                console.error("Errore ricerca calendario:", err);
            }
        }

        // 2. LOCATION SEARCH (Intent: dove, rifugio, base, campo, posto, luogo, accantonamento)
        if (has(['dove', 'posto', 'luogo', 'campo', 'struttura', 'base', 'rifugio', 'accantonamento', 'censito', 'cerca', 'trova'])) {
            try {
                setLastTopic('locations');
                const locations = await getLocations();
                const matches = locations.filter(l => {
                    const nameClean = l.name.toLowerCase();
                    const townClean = (l.commune || '').toLowerCase();
                    const regionClean = (l.region || '').toLowerCase();
                    const notesClean = (l.quickNote || '').toLowerCase();
                    return searchTerms.some(term => nameClean.includes(term) || townClean.includes(term) || regionClean.includes(term) || notesClean.includes(term));
                });
                
                if (matches.length > 0) {
                    const bestMatch = matches[0];
                    return {
                        reply: `🐺 Ho trovato il luogo perfetto nella nostra mappa delle Orme!\n\n📍 **${bestMatch.name}** (${bestMatch.commune || 'Comune non indicato'}, ${bestMatch.region})\n🏠 Posti letto: ${bestMatch.beds || 0} | ⛺ Posti tenda: ${bestMatch.hasTents ? 'Disponibili' : 'Non disponibili'}\n📝 Note rapide: ${bestMatch.quickNote || 'Nessuna nota'}\n\nTi porto al dettaglio del luogo... [REDIRECT: /location/${bestMatch.id}]`,
                        path: `/location/${bestMatch.id}`
                    };
                } else {
                    return {
                        reply: `🐺 Ho cercato nella mappa delle Orme per "${searchTermStr}", ma non ho trovato nessun luogo corrispondente. Se conosci questa base scout, puoi censirla tu stesso per allargare la nostra mappa! [REDIRECT: /add]`,
                        path: '/add'
                    };
                }
            } catch (err) {
                console.error("Errore ricerca luoghi:", err);
            }
        }

        // 3. WAITLIST SEARCH (Intent: bambino, cognome, iscritto, lista)
        if (has(['bambin', 'iscritto', 'iscritti', 'lista', 'attesa', 'richiesta', 'genitore', 'cognome'])) {
            try {
                setLastTopic('waitlist');
                const lista = await getListaAttesa();
                const matches = lista.filter(item => {
                    const nomeClean = item.nomeRagazzo.toLowerCase();
                    const cognomeClean = item.cognomeRagazzo.toLowerCase();
                    const genitoreClean = (item.nomeGenitore || '').toLowerCase();
                    const noteClean = (item.note || '').toLowerCase();
                    return searchTerms.some(term => nomeClean.includes(term) || cognomeClean.includes(term) || genitoreClean.includes(term) || noteClean.includes(term));
                });
                
                if (matches.length > 0) {
                    const list = matches.slice(0, 3).map(item =>
                        `👦 **${item.nomeRagazzo} ${item.cognomeRagazzo}** (Classe scolastica: ${item.classe})\n📞 Genitore: ${item.nomeGenitore} (${item.telefonoGenitore})\n📝 Note: ${item.note || 'Nessuna nota'}`
                    ).join('\n\n');
                    return {
                        reply: `🐺 Ho cercato nel registro della lista d'attesa! Ecco chi corrisponde a "${searchTermStr}":\n\n${list}\n\nTi reindirizzo alla gestione iscrizioni. [REDIRECT: /lista-attesa]`,
                        path: '/lista-attesa'
                    };
                } else {
                    return {
                        reply: `🐺 Ho controllato la lista d'attesa, ma non ho trovato nessun iscritto corrispondente a "${searchTermStr}". Puoi verificare l'elenco completo o inserire una nuova richiesta di iscrizione. [REDIRECT: /lista-attesa]`,
                        path: '/lista-attesa'
                    };
                }
            } catch (err) {
                console.error("Errore ricerca lista attesa:", err);
            }
        }

        // 4. MINUTES SEARCH (Intent: verbale, verbali, delibera, ordine del giorno, odg)
        if (has(['verbale', 'verbali', 'odg', 'ordine del giorno', 'delibera', 'riunione', 'coca', 'co.ca.'])) {
            try {
                setLastTopic('verbali');
                const verbali = await getVerbali();
                const matches = verbali.filter(v => {
                    const odgClean = v.odg.map(o => `${o.titolo} ${o.contenuto} ${o.note || ''}`).join(' ').toLowerCase();
                    const titleClean = v.titolo.toLowerCase();
                    const dataClean = (v.data || '').toLowerCase();
                    const decisioniClean = (v.postiAzione || []).map(p => p.cosa.toLowerCase()).join(' ');
                    const noteClean = (v.varie || '').toLowerCase();
                    return searchTerms.some(term => titleClean.includes(term) || odgClean.includes(term) || dataClean.includes(term) || decisioniClean.includes(term) || noteClean.includes(term));
                });
                
                if (matches.length > 0) {
                    const list = matches.slice(0, 3).map(v =>
                        `📝 **Verbale del ${v.data}**: "${v.titolo}"\n📌 ODG Principale: ${v.odg[0]?.titolo || 'Nessuno'}\n📝 Note varie: ${v.varie || 'Nessuna nota'}`
                    ).join('\n\n');
                    return {
                        reply: `🐺 Ho trovato questi verbali nell'archivio CoCa che corrispondono a "${searchTermStr}":\n\n${list}\n\nTi porto all'elenco dei verbali... [REDIRECT: /verbali]`,
                        path: '/verbali'
                    };
                } else {
                    return {
                        reply: `🐺 Ho scansionato l'archivio dei verbali di CoCa, ma non ho trovato traccia di "${searchTermStr}". Puoi consultare l'elenco completo o scrivere un nuovo verbale. [REDIRECT: /verbali]`,
                        path: '/verbali'
                    };
                }
            } catch (err) {
                console.error("Errore ricerca verbali:", err);
            }
        }

        // 5. GLOBAL FALLBACK SEARCH (search name in locations/eventi directly)
        try {
            const [eventi, locations] = await Promise.all([getEventi(), getLocations()]);
            const eventMatches = eventi.filter(e => e.titolo.toLowerCase().includes(searchTermStr));
            const locMatches = locations.filter(l => l.name.toLowerCase().includes(searchTermStr));
            
            if (locMatches.length > 0) {
                setLastTopic('locations');
                const bestMatch = locMatches[0];
                return {
                    reply: `🐺 Ho trovato questo luogo con lo stesso nome!\n\n📍 **${bestMatch.name}** (${bestMatch.commune || 'Comune non specificato'})\n🏠 Posti letto: ${bestMatch.beds || 0} | ⛺ Posti tenda: ${bestMatch.hasTents ? 'Sì' : 'No'}\n\nTi porto al dettaglio... [REDIRECT: /location/${bestMatch.id}]`,
                    path: `/location/${bestMatch.id}`
                };
            }
            if (eventMatches.length > 0) {
                setLastTopic('calendario');
                const bestMatch = eventMatches[0];
                return {
                    reply: `🐺 Ho trovato questo evento nel calendario di gruppo!\n\n📅 **${bestMatch.titolo}** (${bestMatch.dataInizio})\n📍 Luogo: ${bestMatch.luogo || 'Non indicato'}\n\nTi porto al calendario... [REDIRECT: /calendario]`,
                    path: '/calendario'
                };
            }
        } catch (e) {
            console.error("Errore ricerca globale fallback:", e);
        }

        return null;
    };

    const fetchWikipediaSummary = async (query: string): Promise<string | null> => {
        try {
            // Search Wikipedia
            const searchUrl = `https://it.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();
            
            if (!searchData.query?.search || searchData.query.search.length === 0) {
                return null;
            }
            
            const bestMatch = searchData.query.search[0];
            const title = bestMatch.title;
            
            // Fetch page extract
            const extractUrl = `https://it.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`;
            const extractRes = await fetch(extractUrl);
            const extractData = await extractRes.json();
            
            const pages = extractData.query?.pages;
            if (!pages) return null;
            
            const pageId = Object.keys(pages)[0];
            if (pageId === '-1') return null;
            
            const extract = pages[pageId].extract;
            if (!extract || extract.trim().length === 0) return null;
            
            const trimmed = extract.length > 500 ? extract.substring(0, 500) + '...' : extract;
            
            return `🐺 Ho cercato sulla pista di Wikipedia per darti informazioni aggiornate in tempo reale! Ecco cosa ho trovato su **${title}**:\n\n"${trimmed}"\n\n*Vuoi saperne di più? Puoi cercare "${title}" direttamente sul web!* 🌐`;
        } catch (err) {
            console.error("Errore ricerca Wikipedia:", err);
            return null;
        }
    };

    const getPageLabel = (path: string): string => {
        if (path === '/mappa') return 'Mappa Interattiva';
        if (path === '/add') return 'Aggiungi Luogo';
        if (path === '/verbali/nuovo') return 'Nuovo Verbale';
        if (path === '/verbali') return 'Archivio Verbali';
        if (path === '/calendario') return 'Calendario Eventi';
        if (path === '/lista-attesa') return 'Lista d\'Attesa';
        if (path === '/inventario') return 'Inventario';
        if (path === '/bilancio') return 'Bilancio';
        if (path === '/profile') return 'Profilo Socio';
        if (path === '/settings') return 'Impostazioni';
        if (path.startsWith('/location/')) return 'Dettaglio Luogo';
        return 'Sezione Richiesta';
    };

    // NLP Intent Parser
    const parseIntent = (text: string): { intent: string; reply: string; path?: string } => {
        const clean = text.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,""); // strip punctuation

        const has = (keywords: string[]) => keywords.some(k => clean.includes(k));

        // Contextual follow-up check
        if (has(['altri', 'ancora', 'altro', 'mostra altri', 'ci sono altri', 'e poi', 'quali sono'])) {
            if (lastTopic === 'bp_books') {
                const bookOverview = scoutKnowledgeBase.find(a => a.id === 'bp_libri_overview');
                if (bookOverview) {
                    return {
                        intent: 'scout_knowledge',
                        reply: `🐺 Oltre a quello di cui abbiamo parlato, Baden-Powell ha scritto molte altre opere fondamentali! Ecco la panoramica completa:\n\n${bookOverview.content}`
                    };
                }
            }
        }

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

        // 2.a Mappa Interattiva d'Italia (Visualizzazione Geografica)
        if (
            has(['mappa interattiva', 'mappa d\'italia', 'mappa italia', 'cartina', 'puntini sulla mappa', 'segnaposto sulla mappa']) ||
            (has(['mappa', 'cartina']) && has(['ved', 'mostr', 'apri', 'esplor', 'va al', 'vai al', 'vai alla']))
        ) {
            return {
                intent: 'mappa_interattiva',
                reply: 'Certamente, fratellino! Abbiamo una mappa interattiva d\'Italia spettacolare con tutti i luoghi scout censiti. Ti mostra i raggruppamenti per regione e provincia e, facendo zoom, i dettagli precisi di ogni struttura. Vuoi che ti ci porti? 🗺️',
                path: '/mappa'
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
            if (scoutMatch.category === 'bp_books') {
                setLastTopic('bp_books');
            } else {
                setLastTopic(scoutMatch.category);
            }
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

        // Fallback with dynamic variations
        const fallbacks = [
            'Non sono sicuro di aver capito quale sentiero vuoi percorrere... 🌲 Prova a chiedermi cose come "scrivere un verbale", "vedere la classifica", "lista d\'attesa" o digita "aiuto" per il tutorial.',
            'Fratellino, le mie vecchie zampe si sono confuse su questa pista. 🐾 Prova a riformulare la frase o chiedimi "cosa puoi fare" per vedere la mia mappa di aiuti!',
            'Le fronde della giungla sono fitte e non riesco a scorgere la tua direzione. 🌿 Puoi chiedermi aiuto digitando "aiuto" o "funzioni" per capire come guidarti.'
        ];
        const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];

        return {
            intent: 'fallback',
            reply: randomFallback
        };
    };

    const handleSend = async (textToSend: string) => {
        if (!textToSend.trim()) return;

        if (dailyRemaining <= 0) {
            const quotaMsg: Message = {
                id: crypto.randomUUID(),
                sender: 'akela',
                text: "🐺 La caccia per oggi è terminata, fratellino! Ho camminato a lungo sul sentiero e ora riposo alla rupe del consiglio. I miei lupi ricaricheranno le energie per domani: torna pure a trovarmi dopo la mezzanotte!"
            };
            setMessages(prev => [...prev, quotaMsg]);
            return;
        }

        let queryToProcess = textToSend;
        const cleanLower = textToSend.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();

        // Check if query is a continuation
        const isContinuation = cleanLower.startsWith('e ') || 
                               cleanLower.startsWith('e della ') || 
                               cleanLower.startsWith('e del ') || 
                               cleanLower.startsWith('e di ') || 
                               cleanLower.startsWith('e in ') || 
                               cleanLower.startsWith('invece ') || 
                               cleanLower.startsWith('anche ') || 
                               cleanLower.startsWith('e anche ');

        if (isContinuation && lastTopic) {
            const prefixes = ['e anche ', 'e della ', 'e dello ', 'e dell\'', 'e del ', 'e dei ', 'e degli ', 'e delle ', 'e di ', 'e in ', 'e a ', 'e ', 'invece ', 'anche '];
            let term = cleanLower;
            for (const p of prefixes) {
                if (term.startsWith(p)) {
                    term = term.substring(p.length).trim();
                    break;
                }
            }

            if (term.length > 0) {
                if (lastTopic === 'locations_quantity') {
                    queryToProcess = `quanti luoghi abbiamo in ${term}`;
                } else if (lastTopic === 'waitlist_quantity') {
                    queryToProcess = `quanti ragazzi in lista attesa per ${term}`;
                } else if (lastTopic === 'verbali_quantity') {
                    queryToProcess = `quanti verbali ${term}`;
                } else if (lastTopic === 'calendario_quantity') {
                    queryToProcess = `quanti eventi calendario ${term}`;
                } else if (lastTopic === 'locations') {
                    queryToProcess = `dove si trova ${term}`;
                } else if (lastTopic === 'waitlist') {
                    queryToProcess = `cerca in lista d'attesa ${term}`;
                } else if (lastTopic === 'verbali') {
                    queryToProcess = `cerca nei verbali ${term}`;
                } else if (lastTopic === 'calendario') {
                    queryToProcess = `quando abbiamo ${term}`;
                }
            }
        }

        const userMsg: Message = {
            id: crypto.randomUUID(),
            sender: 'user',
            text: textToSend
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // 1. Primary Conversational AI Engine: Google Gemini via Supabase Edge Function
        if (typeof navigator !== 'undefined' && navigator.onLine) {
            try {
                const historyPayload: AIMessage[] = messages
                    .filter(m => !m.isSystem && m.id !== 'welcome')
                    .slice(-8)
                    .map(m => ({
                        role: (m.sender === 'akela' ? 'model' : 'user') as 'model' | 'user',
                        text: m.text
                    }));

                const botRes = await askAkelaBot(historyPayload, textToSend);

                // Update remaining quota
                setDailyRemaining(botRes.remainingDaily);
                localStorage.setItem('akela_daily_remaining', String(botRes.remainingDaily));
                localStorage.setItem('akela_daily_date', new Date().toISOString().slice(0, 10));

                const akelaMsg: Message = {
                    id: crypto.randomUUID(),
                    sender: 'akela',
                    text: botRes.reply
                };

                setMessages(prev => [...prev, akelaMsg]);
                setIsTyping(false);
                setPendingLearning(null);

                if (botRes.redirectPath) {
                    setPendingRedirect({
                        path: botRes.redirectPath,
                        label: getPageLabel(botRes.redirectPath)
                    });
                }
                return;
            } catch (aiErr: any) {
                console.warn('Avviso: fallback locale attivo a causa di errore Edge Function:', aiErr);
                if (aiErr?.message?.includes('QUOTA_EXCEEDED') || aiErr?.message?.includes('esaurito')) {
                    setDailyRemaining(0);
                    localStorage.setItem('akela_daily_remaining', '0');
                    localStorage.setItem('akela_daily_date', new Date().toISOString().slice(0, 10));
                    const akelaMsg: Message = {
                        id: crypto.randomUUID(),
                        sender: 'akela',
                        text: "🐺 La caccia per oggi è terminata, fratellino! Ho camminato a lungo sul sentiero e ora riposo alla rupe del consiglio. I miei lupi ricaricheranno le energie per domani: torna pure a trovarmi dopo la mezzanotte!"
                    };
                    setMessages(prev => [...prev, akelaMsg]);
                    setIsTyping(false);
                    return;
                }
            }
        }

        // 2. Fallback to Local Database Search (offline mode)
        const dbResult = await handleDatabaseSearch(queryToProcess, queryToProcess);
        if (dbResult) {
            setTimeout(() => {
                const akelaMsg: Message = {
                    id: crypto.randomUUID(),
                    sender: 'akela',
                    text: dbResult.reply
                };
                setMessages(prev => [...prev, akelaMsg]);
                setIsTyping(false);
                setPendingLearning(null);

                if (dbResult.path) {
                    setPendingRedirect({ path: dbResult.path, label: getPageLabel(dbResult.path) });
                }
            }, 600);
            return;
        }

        // 3. Fallback to NLP Intent Parser (offline or key not yet set)
        const parsed = parseIntent(textToSend);
        if (parsed.intent === 'fallback' && typeof navigator !== 'undefined' && navigator.onLine) {
            const wikiReply = await fetchWikipediaSummary(textToSend);
            if (wikiReply) {
                setTimeout(() => {
                    const akelaMsg: Message = {
                        id: crypto.randomUUID(),
                        sender: 'akela',
                        text: wikiReply
                    };
                    setMessages(prev => [...prev, akelaMsg]);
                    setIsTyping(false);
                    setPendingLearning(null);
                }, 500);
                return;
            }
        }

        // 4. Default NLP response (or offline fallback)
        setTimeout(() => {
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

            if (parsed.path) {
                setPendingRedirect({ path: parsed.path, label: getPageLabel(parsed.path) });
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
                    
                    <div className={cn(
                        "fixed bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 shadow-2xl z-[70] flex flex-col overflow-hidden transition-all duration-300 ease-out",
                        isFullscreen 
                            ? "inset-0 md:inset-4 lg:inset-8 w-auto h-auto rounded-none md:rounded-[2rem]" 
                            : "bottom-36 md:bottom-24 right-4 md:right-6 w-[350px] max-w-[92vw] h-[500px] rounded-[2rem] animate-in zoom-in-95 slide-in-from-bottom"
                    )}>
                        {/* Header */}
                        <div className="bg-scout-green dark:bg-scout-green-dark text-white p-3.5 md:p-4 flex flex-col gap-2 shrink-0 transition-colors duration-200">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/15 flex items-center justify-center text-lg md:text-xl shadow-inner shrink-0">
                                    🐺
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-extrabold text-sm md:text-base flex items-center gap-1.5 leading-tight">
                                        Akela 
                                        <span className="flex items-center gap-0.5 text-[8px] md:text-[9px] bg-yellow-400 text-gray-900 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-xs">
                                            <Sparkles size={8} /> AI
                                        </span>
                                    </h3>
                                    <p className="text-[10px] md:text-xs text-white/80 font-bold truncate">Saggio capobranco & guida</p>
                                </div>

                                {/* Fullscreen Toggle Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-all shrink-0 cursor-pointer active:scale-90"
                                    title={isFullscreen ? "Riduci a finestra" : "Ingrandisci a tutto schermo"}
                                >
                                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>

                                {/* Close Button */}
                                <button 
                                    type="button"
                                    onClick={() => { setIsOpen(false); setIsFullscreen(false); }}
                                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-all shrink-0 cursor-pointer active:scale-90"
                                    title="Chiudi Akela"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Token / Energy Quota Bar */}
                            <div className={cn("bg-black/15 dark:bg-black/25 rounded-xl px-3 py-1 flex items-center justify-between text-[10px] md:text-xs", isFullscreen && "max-w-3xl w-full mx-auto")}>
                                <span className="font-medium text-white/90 flex items-center gap-1">
                                    🐾 Energia di oggi:
                                </span>
                                <span className={cn("font-black tracking-wide", dailyRemaining <= 5 ? "text-amber-300 animate-pulse" : "text-yellow-300")}>
                                    {dailyRemaining}/{dailyMax} messaggi
                                </span>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-gray-50/50 dark:bg-gray-950/20">
                            <div className={cn("space-y-3", isFullscreen && "max-w-3xl mx-auto w-full")}>
                                {messages.map(msg => (
                                    <div 
                                        key={msg.id} 
                                        className={cn(
                                            "flex flex-col rounded-2xl p-3 md:p-3.5 text-xs md:text-sm leading-relaxed shadow-xs transition-all animate-in fade-in duration-200",
                                            isFullscreen ? "max-w-[80%]" : "max-w-[85%]",
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
                        </div>

                        {/* Quick Action Chips (Tutorial) */}
                        <div className={cn("p-3 border-t border-gray-100 dark:border-gray-800 flex gap-1.5 overflow-x-auto whitespace-nowrap shrink-0 bg-white dark:bg-gray-900 scrollbar-none", isFullscreen && "justify-center")}>
                            <button 
                                onClick={() => triggerTutorialTopic('campi', '📍 Sentiero Campi')} 
                                className="px-2.5 py-1.5 bg-scout-green/5 dark:bg-scout-green/10 border border-scout-green/20 text-scout-green rounded-full text-[10px] font-black hover:bg-scout-green/10 transition-colors cursor-pointer"
                            >
                                📍 Luoghi
                            </button>
                            <button 
                                onClick={() => triggerTutorialTopic('verbali', '📝 Sentiero Verbali')} 
                                className="px-2.5 py-1.5 bg-scout-blue/5 dark:bg-scout-blue/10 border border-scout-blue/20 text-scout-blue rounded-full text-[10px] font-black hover:bg-scout-blue/10 transition-colors cursor-pointer"
                            >
                                📝 Verbali
                            </button>
                            <button 
                                onClick={() => triggerTutorialTopic('trasporti', '🚌 Sentiero Trasporti')} 
                                className="px-2.5 py-1.5 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 text-purple-650 dark:text-purple-400 rounded-full text-[10px] font-black hover:bg-purple-500/10 transition-colors cursor-pointer"
                            >
                                🚌 Trasporti
                            </button>
                            <button 
                                onClick={() => triggerTutorialTopic('punti', '🏆 Sentiero Classifica')} 
                                className="px-2.5 py-1.5 bg-yellow-500/5 dark:bg-yellow-500/10 border border-yellow-500/20 text-yellow-650 dark:text-yellow-500 rounded-full text-[10px] font-black hover:bg-yellow-500/10 transition-colors cursor-pointer"
                            >
                                🏆 Classifica
                            </button>
                            <button 
                                onClick={() => triggerTutorialTopic('lista', '📋 Sentiero Lista Attesa')} 
                                className="px-2.5 py-1.5 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-full text-[10px] font-black hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                                📋 Lista Attesa
                            </button>
                        </div>

                        {/* Learning Confirmation Overlay */}
                        {pendingLearning && (
                            <div className="p-3 bg-scout-green/10 dark:bg-emerald-950/20 border-t border-gray-150 dark:border-gray-800 flex flex-col gap-2 shrink-0 animate-in fade-in duration-200">
                                <div className={cn("space-y-2", isFullscreen && "max-w-3xl mx-auto w-full")}>
                                    <p className="text-[10px] md:text-xs text-gray-700 dark:text-gray-300 font-bold leading-normal">
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
                                            className="flex-1 py-1.5 bg-scout-green dark:bg-scout-green-dark text-white text-[10px] md:text-xs font-black rounded-lg hover:opacity-90 active:scale-95 transition-all text-center cursor-pointer"
                                        >
                                            Conferma
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPendingLearning(null)}
                                            className="px-3 py-1.5 bg-gray-150 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] md:text-xs font-black rounded-lg hover:bg-gray-205 dark:hover:bg-gray-705 active:scale-95 transition-all cursor-pointer"
                                        >
                                            Annulla
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {pendingRedirect && (
                            <div className="p-3 bg-scout-green/10 dark:bg-emerald-955/20 border-t border-gray-150 dark:border-gray-800 flex flex-col gap-2 shrink-0 animate-in fade-in duration-200">
                                <div className={cn("space-y-2", isFullscreen && "max-w-3xl mx-auto w-full")}>
                                    <p className="text-[10px] md:text-xs text-gray-700 dark:text-gray-300 font-bold leading-normal">
                                        🐺 Vuoi che ti accompagni alla sezione <span className="text-scout-green-dark dark:text-scout-green-light font-extrabold">"{pendingRedirect.label}"</span>?
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigate(pendingRedirect.path);
                                                setPendingRedirect(null);
                                            }}
                                            className="flex-1 py-1.5 bg-scout-green dark:bg-scout-green-dark text-white text-[10px] md:text-xs font-black rounded-lg hover:opacity-90 active:scale-95 transition-all text-center cursor-pointer"
                                        >
                                            Sì, vai
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPendingRedirect(null)}
                                            className="px-3 py-1.5 bg-gray-150 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] md:text-xs font-black rounded-lg hover:bg-gray-205 dark:hover:bg-gray-705 active:scale-95 transition-all cursor-pointer"
                                        >
                                            No, rimani qui
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Input Area */}
                        {dailyRemaining <= 0 ? (
                            <div className="p-3.5 md:p-4 bg-amber-50/90 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-900/40 text-center text-xs md:text-sm font-bold text-amber-800 dark:text-amber-200 shrink-0">
                                🌙 Akela sta riposando alla rupe. Energia ricaricata a mezzanotte!
                            </div>
                        ) : (
                            <div className="p-3 md:p-4 bg-white dark:bg-gray-900 border-t border-gray-150 dark:border-gray-800 shrink-0">
                                <form 
                                    onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                                    className={cn("flex gap-2 items-center", isFullscreen && "max-w-3xl mx-auto w-full")}
                                >
                                    <input 
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Chiedi ad Akela..."
                                        className="flex-1 px-3.5 py-2.5 border border-gray-250 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-950 text-xs md:text-sm font-bold outline-none focus:ring-1 focus:ring-scout-green dark:text-white"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!input.trim() || isTyping}
                                        className="p-2.5 bg-scout-green dark:bg-scout-green-dark text-white rounded-xl hover:bg-scout-green-dark transition-all disabled:opacity-40 disabled:scale-100 active:scale-95 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 cursor-pointer"
                                    >
                                        <Send size={15} />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    );
}
