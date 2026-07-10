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
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            sender: 'akela',
            text: 'Ciao! Sono Akela, il vecchio lupo saggio di Orme. 🐺 Dimmi dove vuoi andare o chiedimi aiuto per imparare ad usare l\'app! Cosa vuoi esplorare oggi?'
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // NLP Intent Parser
    const parseIntent = (text: string): { intent: string; reply: string; path?: string } => {
        const clean = text.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,""); // strip punctuation

        const has = (keywords: string[]) => keywords.some(k => clean.includes(k));

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

        // 2. Censimento / Luoghi
        if (has(['luogh', 'camp', 'post', 'struttur', 'censi'])) {
            if (has(['aggiung', 'inser', 'mapp', 'nuov'])) {
                return {
                    intent: 'nuovo_luogo',
                    reply: 'Molto bene! Espandiamo la mappa del nostro censimento. Ti porto alla pagina per aggiungere un luogo. 📍',
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

        // Process response
        setTimeout(() => {
            const parsed = parseIntent(textToSend);
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
                replyText = '📍 **SENTIERO CAMPI (Censimento)**: In questa sezione trovi la mappa e l\'elenco di tutti i campi scout e le case censiti. Puoi cercare filtrando per posti letto, bagni o servizi. Per aggiungere un campo che conosci, usa il tasto "+" nella Home!';
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
                        <div className="bg-scout-blue text-white p-4 flex items-center gap-3 shrink-0">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl shadow-inner">
                                🐺
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm flex items-center gap-1.5 leading-tight">
                                    Akela 
                                    <span className="flex items-center gap-0.5 text-[9px] bg-yellow-400 text-gray-900 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                                        <Sparkles size={8} /> Guide
                                    </span>
                                </h3>
                                <p className="text-[10px] text-blue-100 font-medium">Il tuo saggio assistente di branca</p>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="ml-auto p-1 text-blue-100 hover:text-white hover:bg-white/10 rounded-full transition-colors"
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
                                📍 Censimento
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
                                className="flex-1 px-3 py-2 border border-gray-250 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-950 text-xs font-bold outline-none focus:ring-1 focus:ring-scout-blue dark:text-white"
                            />
                            <button 
                                type="submit"
                                disabled={!input.trim()}
                                className="p-2 bg-scout-blue text-white rounded-xl hover:bg-scout-blue-dark transition-all disabled:opacity-40 disabled:scale-100 active:scale-95 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20"
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
