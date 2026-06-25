import { useState, useEffect } from 'react';
import {
    BookOpen,
    Trophy,
    Smartphone,
    PlusCircle,
    Zap,
    Clock,
    Footprints,
    Users,
    Archive,
    Wrench,
    ClipboardCheck,
    Calendar,
    Bus,
    FileText,
    Search,
    ListOrdered,
    ShieldCheck
} from 'lucide-react';
import { User } from '@/types';
import { getAllUsers } from '@/lib/data';
import UserAvatar from '@/components/UserAvatar';
import { LEVELS } from '@/lib/gamification';
import { cn } from '@/lib/utils';

export default function Guide() {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        getAllUsers().then(setUsers).catch(console.error);
    }, []);

    const pointRules = [
        { action: 'Aggiunta nuovo luogo', points: 10, icon: <PlusCircle size={18} className="text-scout-green" /> },
        { action: 'Aggiunta sito web', points: 2, icon: <Zap size={18} className="text-scout-blue" /> },
        { action: 'Aggiunta Indirizzo/Maps/GPS', points: 3, icon: <Zap size={18} className="text-scout-blue" /> },
        { action: 'Inserimento prezzi e tariffe', points: 5, icon: <Zap size={18} className="text-scout-blue" /> },
        { action: 'Aggiunta evento a calendario', points: 3, icon: <Trophy size={18} className="text-scout-green" /> },
        { action: 'Ricerca nei luoghi (1 al giorno)', points: 1, icon: <Footprints size={18} className="text-scout-blue" /> },
        { action: 'Lettura di un verbale (una tantum)', points: 5, icon: <BookOpen size={18} className="text-scout-brown" /> },
        { action: 'Aggiunta memoria storica', points: 5, icon: <Archive size={18} className="text-scout-blue" /> },
        { action: 'Lasciare un\'orma (recensione)', points: 10, icon: <Footprints size={18} className="text-scout-green" /> },
        { action: 'Controllo / aggiornamento attrezzi (magazzino)', points: 2, icon: <Wrench size={18} className="text-scout-blue" /> },
        { action: 'Censimento rapido di un luogo (Audit)', points: 15, icon: <ClipboardCheck size={18} className="text-scout-green" /> },
    ];

    const stalenessRules = [
        { label: 'Aggiornato di recente', desc: 'Meno di 1 anno fa', color: 'bg-green-500' },
        { label: 'Da verificare', desc: 'Più di 1 anno fa', color: 'bg-yellow-500' },
        { label: 'Potrebbe essere cambiato', desc: 'Più di 2 anni fa', color: 'bg-orange-500' },
        { label: 'Molto datato', desc: 'Più di 3 anni fa', color: 'bg-red-500' },
    ];

    return (
        <div className="space-y-8 pb-24">
            <div className="text-center py-6">
                <h1 className="text-3xl font-bold text-scout-green mb-2">Guida Orme</h1>
                <p className="text-gray-500">Tutto quello che c'è da sapere per usare al meglio l'app.</p>
            </div>

            {/* 1. Come usare l'app */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-4 duration-200">
                <h2 className="text-xl font-bold text-scout-brown dark:text-amber-500 mb-2 flex items-center gap-2">
                    <BookOpen /> Come usare l'app
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                    Orme è lo strumento collaborativo progettato per semplificare la gestione logistica, organizzativa e storica del nostro gruppo scout. Di seguito una panoramica dettagliata di tutte le funzionalità disponibili:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. Ricerca e Filtro Luoghi */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 shadow-xs hover:shadow-md transition-all duration-200">
                        <div className="bg-scout-green/10 dark:bg-emerald-950/30 text-scout-green dark:text-emerald-400 p-3 rounded-xl shrink-0 w-fit h-fit">
                            <Search size={22} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider">Cerca & Filtra Luoghi</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                Trova accantonamenti, basi scout e terreni per il campeggio. Puoi effettuare ricerche testuali (nome del posto, città) e applicare filtri avanzati per:
                            </p>
                            <ul className="text-[11px] text-gray-500 dark:text-gray-400 list-disc pl-4 space-y-1">
                                <li><strong>Branca consigliata</strong> (L/C, E/G, R/S, CoCa, Gruppo)</li>
                                <li><strong>Servizi inclusi</strong> (acqua potabile, energia elettrica, riscaldamento, spazio tende, bagni, cucina, posti letto)</li>
                            </ul>
                        </div>
                    </div>

                    {/* 2. Inserimento e Modifica Istantanea */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 shadow-xs hover:shadow-md transition-all duration-200">
                        <div className="bg-scout-green/10 dark:bg-emerald-950/30 text-scout-green dark:text-emerald-400 p-3 rounded-xl shrink-0 w-fit h-fit">
                            <PlusCircle size={22} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider">Inserimento & Modifiche al Volo</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                Collabora per tenere aggiornato il nostro archivio comune. Se scopri un nuovo posto o se noti che un contatto o una tariffa sono cambiati:
                            </p>
                            <ul className="text-[11px] text-gray-500 dark:text-gray-400 list-disc pl-4 space-y-1">
                                <li>Registra un nuovo luogo con il pulsante <strong>"+"</strong> in Home</li>
                                <li>Modifica istantaneamente qualsiasi informazione obsoleta direttamente dalla scheda del luogo</li>
                                <li>Ottieni punti in classifica per ogni dato inserito o corretto</li>
                            </ul>
                        </div>
                    </div>

                    {/* 3. Storico Modifiche & Tracciabilità */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 shadow-xs hover:shadow-md transition-all duration-200">
                        <div className="bg-scout-green/10 dark:bg-emerald-950/30 text-scout-green dark:text-emerald-400 p-3 rounded-xl shrink-0 w-fit h-fit">
                            <Clock size={22} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider">Storico Modifiche & Novità</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                Mantieni sotto controllo la freschezza e l'affidabilità dei dati. L'app offre un sistema di tracciamento completo delle modifiche:
                            </p>
                            <ul className="text-[11px] text-gray-500 dark:text-gray-400 list-disc pl-4 space-y-1">
                                <li><strong>Stato dei dati</strong> (verde, giallo, arancione, rosso) per vedere a colpo d'occhio l'ultimo aggiornamento</li>
                                <li><strong>Badge rosso pulsante</strong> sulle schede in Home per segnalare modifiche che non hai ancora letto</li>
                                <li><strong>Registro storico</strong> nel dettaglio del luogo per scorrere la cronologia di chi ha modificato cosa</li>
                            </ul>
                        </div>
                    </div>

                    {/* 4. Gestione Verbali */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 shadow-xs hover:shadow-md transition-all duration-200">
                        <div className="bg-scout-green/10 dark:bg-emerald-950/30 text-scout-green dark:text-emerald-400 p-3 rounded-xl shrink-0 w-fit h-fit">
                            <FileText size={22} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider">Gestione Verbali di CoCa</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                Digitalizza e archivia la memoria scritta delle riunioni di staff e di Comunità Capi:
                            </p>
                            <ul className="text-[11px] text-gray-500 dark:text-gray-400 list-disc pl-4 space-y-1">
                                <li>Scrivi verbali direttamente nell'editor integrato dell'app</li>
                                <li><strong>Notifiche automatiche</strong> istantanee via email e in-app a tutti i capi (compreso l'autore) alla pubblicazione</li>
                                <li><strong>Esporta in PDF o Word (DOCX)</strong> per la stampa o l'archivio esterno</li>
                            </ul>
                        </div>
                    </div>

                    {/* 5. Inventario di Gruppo */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 shadow-xs hover:shadow-md transition-all duration-200">
                        <div className="bg-scout-green/10 dark:bg-emerald-950/30 text-scout-green dark:text-emerald-400 p-3 rounded-xl shrink-0 w-fit h-fit">
                            <Wrench size={22} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider">Inventario & Magazzino</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                Tieni sempre sotto controllo lo stato dei materiali di gruppo per evitare imprevisti prima di un'uscita:
                            </p>
                            <ul className="text-[11px] text-gray-500 dark:text-gray-400 list-disc pl-4 space-y-1">
                                <li>Suddivisione dell'inventario (tende, pali, cucine, attrezzi vari) per branca proprietaria</li>
                                <li>Aggiornamento rapido dello <strong>stato di conservazione</strong> (ottimo, buono, usurato, da riparare) e delle quantità</li>
                                <li>Censimenti rapidi (Audit) per associare i materiali a specifici luoghi</li>
                            </ul>
                        </div>
                    </div>

                    {/* 6. Calendario Attività */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 shadow-xs hover:shadow-md transition-all duration-200">
                        <div className="bg-scout-green/10 dark:bg-emerald-950/30 text-scout-green dark:text-emerald-400 p-3 rounded-xl shrink-0 w-fit h-fit">
                            <Calendar size={22} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider">Calendario Condiviso</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                Coordinazione temporale per tutto il gruppo e per le singole branche:
                            </p>
                            <ul className="text-[11px] text-gray-500 dark:text-gray-400 list-disc pl-4 space-y-1">
                                <li>Inserimento di uscite di branca, campi, riunioni di CoCa e scadenze burocratiche</li>
                                <li>Visualizzazione mensile integrata per evitare sovrapposizioni di date e coordinare l'uso dei materiali comuni</li>
                            </ul>
                        </div>
                    </div>

                    {/* 7. Rubrica Trasporti & Preventivi */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 shadow-xs hover:shadow-md transition-all duration-200">
                        <div className="bg-scout-green/10 dark:bg-emerald-950/30 text-scout-green dark:text-emerald-400 p-3 rounded-xl shrink-0 w-fit h-fit">
                            <Bus size={22} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider">Rubrica Trasporti & Preventivi</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                Gestisci i contatti delle ditte di pullman/autolinee e pianifica i viaggi in modo efficiente:
                            </p>
                            <ul className="text-[11px] text-gray-500 dark:text-gray-400 list-disc pl-4 space-y-1">
                                <li>Accedi all'elenco dei trasportatori tramite il <strong>pulsante fluttuante blu</strong> in basso a destra in Home</li>
                                <li>Calcola in automatico i chilometri di percorrenza e la <strong>quota stimata per persona</strong> inserendo il preventivo e il numero di partecipanti</li>
                                <li>Filtra per località di partenza, capacità posti e tariffe</li>
                            </ul>
                        </div>
                    </div>

                    {/* 8. Lista d'Attesa Iscrizioni */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 shadow-xs hover:shadow-md transition-all duration-200">
                        <div className="bg-scout-green/10 dark:bg-emerald-950/30 text-scout-green dark:text-emerald-400 p-3 rounded-xl shrink-0 w-fit h-fit">
                            <ListOrdered size={22} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider">Lista d'Attesa Iscrizioni</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                Un unico punto di raccolta per monitorare le richieste di iscrizione al gruppo:
                            </p>
                            <ul className="text-[11px] text-gray-500 dark:text-gray-400 list-disc pl-4 space-y-1">
                                <li>Inserisci e consulta i dati anagrafici e i contatti dei bambini e ragazzi in attesa</li>
                                <li>Ordina e filtra per branca di destinazione (L/C, E/G, R/S) e data di inserimento</li>
                                <li>Evita la perdita di fogli cartacei o file locali sparsi, mantenendo l'archivio al sicuro e centralizzato</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Guida ai Livelli */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-scout-blue dark:text-blue-500 mb-4 flex items-center gap-2">
                    <Trophy className="text-scout-blue dark:text-blue-500" /> Guida ai Livelli
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">Scala la vetta e personalizza il tuo profilo con i colori dei livelli.</p>

                <div className="space-y-3">
                    {LEVELS.map((lvl) => (
                        <div key={lvl.level} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                            <div
                                className="w-12 h-12 rounded-full border-4 shrink-0 bg-white dark:bg-gray-800 flex items-center justify-center font-bold text-gray-400 dark:text-gray-500"
                                style={{ borderColor: lvl.color }}
                            >
                                {lvl.level}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{lvl.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{lvl.min} - {lvl.max === Infinity ? '∞' : lvl.max} punti</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. Regolamento Punti */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-scout-green dark:text-emerald-500 mb-4 flex items-center gap-2">
                    <Zap className="text-yellow-500 dark:text-yellow-400" /> Regolamento Punteggi
                </h2>

                <div className="grid grid-cols-1 gap-3">
                    {pointRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                {rule.icon}
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{rule.action}</span>
                            </div>
                            <span className="font-bold text-scout-green dark:text-emerald-500">+{rule.points} pt</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. Stato dei Dati */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-scout-brown dark:text-amber-500 mb-4 flex items-center gap-2">
                    <Clock className="text-scout-brown dark:text-amber-500" /> Legenda Stato Dati
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Un pallino colorato sulla scheda indica quanto sono recenti le informazioni.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {stalenessRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className={cn("w-3 h-3 rounded-full shrink-0 animate-pulse", rule.color)} />
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">{rule.label}</h4>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{rule.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 5. Installazione App */}
            <section className="bg-scout-brown/5 dark:bg-amber-950/20 p-6 rounded-2xl border border-scout-brown/10 dark:border-amber-900/20">
                <h2 className="text-xl font-bold text-scout-brown dark:text-amber-500 mb-4 flex items-center gap-2">
                    <Smartphone /> Scaricare l'app (PWA)
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                    Puoi installare Orme sul tuo smartphone per aprirla come una vera app, senza usare il browser. L'icona apparirà tra le tue app!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <span className="bg-gray-100 dark:bg-gray-900 p-1 rounded"></span> iPhone / iOS (Safari)
                        </h3>
                        <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-2 list-decimal ml-4">
                            <li>Apri il sito su <strong>Safari</strong>.</li>
                            <li>Tocca il tasto <strong>Condividi</strong> (quadrato con freccia su).</li>
                            <li>Scorri e tocca <strong>"Aggiungi alla schermata Home"</strong>.</li>
                            <li>Conferma cliccando su <strong>Aggiungi</strong>.</li>
                        </ol>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <span className="bg-gray-100 dark:bg-gray-900 p-1 rounded text-green-600 dark:text-green-500">🤖</span> Android (Chrome)
                        </h3>
                        <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-2 list-decimal ml-4">
                            <li>Apri il sito su <strong>Chrome</strong>.</li>
                            <li>Tocca i <strong>tre puntini</strong> in alto a destra.</li>
                            <li>Seleziona <strong>"Installa app"</strong> o "Aggiungi a schermata Home".</li>
                            <li>Clicca sul pulsante <strong>"Sì, scarica"</strong> nel pop-up che appare nell'app.</li>
                        </ol>
                    </div>
                </div>

                <p className="text-[10px] text-center text-gray-400 mt-6 italic">
                    L'app si aggiornerà da sola ogni volta che aggiungeremo nuove funzionalità!
                </p>
            </section>

            {/* 6. L'origine delle nostre Orme */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mt-12">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-scout-green dark:text-emerald-500 mb-2">L'origine delle nostre Orme</h2>
                    <p className="text-gray-500 dark:text-gray-400 italic">"Lasciare tracce utili, aggiornate e facili da seguire."</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-lg mb-3 text-scout-brown dark:text-amber-500 flex items-center gap-2">
                            <Footprints size={20} /> Il Problema a Monte
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
                            Gestire le attività di una Comunità Capi e di un intero gruppo scout comporta sfide logistiche e organizzative quotidiane. Troppo spesso ci si scontra con inefficienze che rubano tempo prezioso al nostro servizio educativo:
                        </p>
                        <ul className="text-xs text-gray-650 dark:text-gray-450 list-disc pl-5 space-y-2">
                            <li><strong>Inventario attrezzi disperso:</strong> La mancanza di un database aggiornato e centralizzato per il magazzino (tende di reparto, paleria, cucine, bombole gas) rischia di farci scoprire solo a ridosso del campo la mancanza di materiali fondamentali.</li>
                            <li><strong>Contatti e strutture difficili da reperire:</strong> I recapiti dei proprietari dei terreni o dei custodi delle case vacanza sono spesso frammentati tra vecchie chat WhatsApp, quaderni personali o file Drive dimenticati, rendendo ostica la prenotazione.</li>
                            <li><strong>Monitoraggio nuove iscrizioni:</strong> Le richieste di inserimento dei bambini e ragazzi rischiano di andare perse su fogli cartacei o file Word sparsi nei computer dei singoli capi, ostacolando una corretta gestione della lista d'attesa.</li>
                            <li><strong>Storico dei luoghi non tracciato:</strong> Senza una memoria storica, è difficile sapere dove le branche sono state negli anni passati, con il rischio di ripetere la stessa meta per due anni consecutivi o perdere i feedback preziosi di chi ci è già stato.</li>
                            <li><strong>Gestione del bilancio e dei preventivi:</strong> Calcolare i costi dei trasporti stradali, confrontare preventivi e stimare le quote a persona per i ragazzi senza uno strumento dedicato genera incertezza ed errori di bilancio.</li>
                        </ul>
                    </div>

                    <div className="bg-scout-green/5 dark:bg-emerald-950/20 p-5 rounded-2xl border border-scout-green/10 dark:border-emerald-900/30">
                        <h3 className="font-bold text-lg mb-3 text-scout-green dark:text-emerald-500 flex items-center gap-2">
                            <Users size={20} /> La Risposta: Orme
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            Orme nasce per rispondere a tutte queste necessità offrendo una piattaforma centralizzata e condivisa per la nostra Comunità Capi. Ogni volta che visitiamo un luogo, aggiorniamo un attrezzo o pianifichiamo una tratta, lasciamo delle "orme" stabili per chi verrà dopo. Le informazioni non sono più proprietà del singolo capo, ma diventano un patrimonio comune e sempre accessibile.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-lg mb-3 text-scout-green-dark dark:text-emerald-400 flex items-center gap-2">
                            <ShieldCheck size={20} /> Responsabilità e Tracciabilità
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                            Per favorire la collaborazione immediata ed evitare colli di bottiglia decisionali, ogni capo può inserire o modificare i dati in modo diretto e istantaneo. La trasparenza è però garantita dal <strong>registro storico delle modifiche</strong>: ogni variazione viene tracciata indicando l'autore, la data e i dettagli modificati, responsabilizzando ognuno a mantenere le informazioni aggiornate e veritiere.
                        </p>
                        
                        <h4 className="font-bold text-scout-green-dark dark:text-emerald-500 mb-3 mt-6 border-t border-gray-100 dark:border-gray-700 pt-4 text-sm">Hanno accesso all'app:</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {users.length === 0 ? (
                                <p className="text-gray-400 text-xs col-span-full">Nessun utente registrato.</p>
                            ) : (
                                users.map(user => (
                                    <div key={user.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <UserAvatar user={user} size="sm" />
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-gray-100 text-xs">{user.firstName} {user.lastName}</p>
                                            <p className="text-[10px] text-scout-green dark:text-emerald-400 font-medium">@{user.nickname}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <div className="text-center text-xs text-gray-400 py-4 mt-8">
                <p>Fondatore: Demi Cistulli</p>
                <p>Gruppo Scout Turi 1</p>
                <p className="mt-2">© 2026 Orme</p>
            </div>
        </div>
    );
}
