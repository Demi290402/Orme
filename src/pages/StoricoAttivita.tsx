import { useState, useEffect, useMemo } from 'react';
import { Archive, Plus, MapPin, Calendar, Trash2, X, Send, User } from 'lucide-react';
import { getStorico, salvaEventoStorico, eliminaEventoStorico, EventoStorico } from '@/lib/storico';
import { getUser } from '@/lib/data';
import { User as UserType } from '@/types';

const BRANCH_COLORS: Record<string, string> = {
    'L/C': '#facc15', // Yellow
    'E/G': '#22c55e', // Green
    'R/S': '#ef4444', // Red
    'CoCa': '#8b5cf6', // Purple
    'Gruppo': '#3b82f6', // Blue
};

const BRANCH_ACTIVITIES: Record<string, string[]> = {
    'L/C': ['Vacanze di Branco', 'Caccia primaverile', 'Caccia invernale', 'Caccia di Accettazione', 'Altro'],
    'E/G': ['Campo estivo', 'Campo invernale', 'San Giorgio', 'Uscita di Reparto', 'Altro'],
    'R/S': ['Route estiva', 'Route invernale', 'Route primaverile', 'Altro'],
    'CoCa': ['Pernotto CoCa', 'Route CoCa', 'Altro'],
    'Gruppo': ['Campo di gruppo', 'Uscita di apertura', 'Uscita dei passaggi', 'Altro']
};

export default function StoricoAttivita() {
    const [eventi, setEventi] = useState<EventoStorico[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const currentYear = new Date().getMonth() >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    const [editId, setEditId] = useState<string | null>(null);
    const [annoScout, setAnnoScout] = useState<number>(currentYear);
    const [branca, setBranca] = useState<string>('L/C');
    const [tipoEvento, setTipoEvento] = useState<string>(BRANCH_ACTIVITIES['L/C'][0]);
    const [luogoNome, setLuogoNome] = useState('');
    const [dataInizio, setDataInizio] = useState('');
    const [dataFine, setDataFine] = useState('');

    const reload = async () => {
        setLoading(true);
        const data = await getStorico();
        setEventi(data);
        setLoading(false);
    };

    const calculateScoutYear = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return currentYear;
        // Ottobre è il mese 9 (0-indexed)
        return date.getMonth() >= 9 ? date.getFullYear() : date.getFullYear() - 1;
    };

    useEffect(() => {
        getUser().then(setCurrentUser).catch(console.error);
        reload();
    }, []);

    // Aggiorna l'anno scout automaticamente quando cambia la data di inizio
    useEffect(() => {
        if (dataInizio && !editId) {
            setAnnoScout(calculateScoutYear(dataInizio));
        }
    }, [dataInizio, editId]);

    // Change tipoEvento options when branca changes
    useEffect(() => {
        if (!BRANCH_ACTIVITIES[branca]?.includes(tipoEvento)) {
            setTipoEvento(BRANCH_ACTIVITIES[branca]?.[0] || 'Altro');
        }
    }, [branca]);

    const openEdit = (ev: EventoStorico) => {
        setEditId(ev.id);
        setAnnoScout(ev.annoScout);
        setBranca(ev.branca);
        setTipoEvento(ev.tipoEvento);
        setLuogoNome(ev.luogoNome);
        setDataInizio(ev.dataInizio);
        setDataFine(ev.dataFine || '');
        setShowForm(true);
    };

    const onCloseForm = () => {
        setShowForm(false);
        setEditId(null);
        setAnnoScout(currentYear);
        setBranca('L/C');
        setLuogoNome('');
        setDataInizio('');
        setDataFine('');
    };

    const handleSave = async () => {
        if (!luogoNome.trim() || !dataInizio || !tipoEvento) return;
        
        await salvaEventoStorico({
            id: editId || undefined,
            annoScout,
            branca,
            tipoEvento,
            luogoNome,
            dataInizio,
            dataFine: dataFine || undefined
        });
        
        onCloseForm();
        reload();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Sei sicuro di voler rimuovere questo evento dall'archivio storico?")) return;
        await eliminaEventoStorico(id);
        reload();
    };

    const groupedEvents = useMemo(() => {
        const groups: Record<number, EventoStorico[]> = {};
        eventi.forEach(e => {
            if (!groups[e.annoScout]) groups[e.annoScout] = [];
            groups[e.annoScout].push(e);
        });
        Object.keys(groups).forEach(y => {
            groups[Number(y)].sort((a,b) => b.dataInizio.localeCompare(a.dataInizio));
        });
        return groups;
    }, [eventi]);

    const sortedYears = Object.keys(groupedEvents).map(Number).sort((a,b) => b - a);

    return (
        <div className="pb-24 max-w-4xl mx-auto space-y-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3 text-scout-blue dark:text-blue-400">
                        <Archive size={32} />
                        Storico Attività
                    </h1>
                    <p className="text-gray-500 mt-1 dark:text-gray-400 font-medium tracking-wide">
                        L'enciclopedia delle route, campi e caccie della storia del gruppo.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="shrink-0 bg-scout-blue hover:bg-blue-700 text-white p-3.5 rounded-2xl shadow-lg transition-all flex items-center gap-2 font-bold focus:ring-4 focus:ring-blue-500/30 active:scale-95"
                >
                    <Plus size={20} /> <span className="hidden sm:inline">Aggiungi Memoria</span>
                </button>
            </header>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCloseForm}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto duration-200 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-bold dark:text-white">
                                {editId ? 'Modifica Memoria' : 'Aggiungi Memoria Storica'}
                            </h2>
                            <button onClick={onCloseForm} className="p-2 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-300 hover:bg-red-100 hover:text-red-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Anno Scout (Inizio)</label>
                                <input
                                    type="number"
                                    value={annoScout}
                                    onChange={e => setAnnoScout(Number(e.target.value))}
                                    className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-scout-blue font-bold text-lg dark:text-white"
                                    placeholder="Es. 2024"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">L'anno d'inizio asssociativo (Es. 2024 per il 2024-2025).</p>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Branca</label>
                                <select
                                    value={branca}
                                    onChange={e => setBranca(e.target.value)}
                                    className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-scout-blue font-bold dark:text-white"
                                >
                                    {Object.keys(BRANCH_COLORS).map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Tipo Evento</label>
                            <select
                                value={tipoEvento}
                                onChange={e => setTipoEvento(e.target.value)}
                                className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-scout-blue font-bold dark:text-white"
                            >
                                {BRANCH_ACTIVITIES[branca]?.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Nome Luogo / Località *</label>
                            <input
                                type="text"
                                value={luogoNome}
                                onChange={e => setLuogoNome(e.target.value)}
                                placeholder="Es. Base Scout Bracciano, Abruzzo"
                                className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-scout-blue dark:text-white placeholder:text-gray-400"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Data Inizio *</label>
                                <input
                                    type="date"
                                    value={dataInizio}
                                    onChange={e => setDataInizio(e.target.value)}
                                    className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-scout-blue text-sm dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Data Fine (Opz.)</label>
                                <input
                                    type="date"
                                    value={dataFine}
                                    onChange={e => setDataFine(e.target.value)}
                                    className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-scout-blue text-sm dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                            <button
                                onClick={handleSave}
                                disabled={!luogoNome.trim() || !dataInizio}
                                className="w-full py-4 bg-scout-blue text-white font-black tracking-wide rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md focus:ring-4 focus:ring-blue-500/30"
                            >
                                <Send size={20} /> SALVA NELLA STORIA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline */}
            <div className="space-y-12">
                {loading ? (
                    <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                        <Archive size={48} className="animate-pulse mb-4 text-gray-300" />
                        <p>Polvere in archivio... recupero in corso</p>
                    </div>
                ) : sortedYears.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 p-12 text-center rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Archive size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-6" />
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Lo storico è vuoto.</h3>
                        <p className="text-gray-500 font-medium">Inizia a scrivere la storia del gruppo inserendo il primo evento passato!</p>
                    </div>
                ) : (
                    sortedYears.map(year => (
                        <div key={year} className="relative">
                            <div className="sticky top-[73px] z-20 py-2 -mx-4 px-4 bg-scout-beige-light/95 dark:bg-gray-900/95 backdrop-blur-md">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 w-fit">
                                    <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-1.5 rounded-full shadow-lg">
                                        {year} — {year + 1}
                                    </span>
                                </h2>
                            </div>
                            
                            <div className="mt-6 ml-4 sm:ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-6 sm:pl-10 space-y-8 relative">
                                {groupedEvents[year].map(ev => {
                                    const dotColor = BRANCH_COLORS[ev.branca] || '#9CA3AF';
                                    const isOwn = ev.autoreId === currentUser?.id;
                                    
                                    return (
                                        <div key={ev.id} className="relative group">
                                            {/* Timeline Node */}
                                            <div 
                                                className="absolute -left-[31px] sm:-left-[47px] top-4 w-4 h-4 rounded-full border-4 border-white dark:border-gray-900 shadow-sm z-10 transition-transform group-hover:scale-125"
                                                style={{ backgroundColor: dotColor }}
                                            />
                                            
                                            {/* Event Card */}
                                            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.1)] dark:shadow-none border border-gray-100 dark:border-gray-700 transition-all hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.15)] group-hover:-translate-y-1">
                                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                                    
                                                    {/* Content Left */}
                                                    <div className="flex-1 space-y-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span 
                                                                className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg text-white shadow-sm"
                                                                style={{ backgroundColor: dotColor }}
                                                            >
                                                                {ev.branca}
                                                            </span>
                                                            <span className="text-sm font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                                                                {ev.tipoEvento}
                                                            </span>
                                                        </div>
                                                        
                                                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                                                            <MapPin className="inline-block mr-1 text-gray-400" size={20} />
                                                            {ev.luogoNome}
                                                        </h3>
                                                        
                                                        <div className="flex items-center gap-2 text-scout-blue dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 w-fit px-3 py-1.5 rounded-xl">
                                                            <Calendar size={16} />
                                                            {new Date(ev.dataInizio).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                                                            {ev.dataFine && ` - ${new Date(ev.dataFine).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`}
                                                        </div>
                                                        
                                                        {ev.autoreNome && (
                                                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                                                                <User size={14} /> Memoria aggiunta da: {ev.autoreNome}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions Right */}
                                                    <div className="flex sm:flex-col justify-end sm:justify-start gap-2 border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-gray-700 pt-4 sm:pt-0 sm:pl-4">
                                                        <button onClick={() => openEdit(ev)} className="px-4 py-2 sm:p-2 sm:w-10 sm:h-10 text-gray-400 hover:text-scout-blue hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl transition-colors font-bold sm:font-normal text-sm flex items-center justify-center">
                                                            Modifica
                                                        </button>
                                                        {isOwn && (
                                                            <button onClick={() => handleDelete(ev.id)} className="px-4 py-2 sm:p-2 sm:w-10 sm:h-10 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-bold sm:font-normal text-sm flex items-center justify-center">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            {/* Guide Info */}
            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl mt-12 border border-blue-100 dark:border-blue-900/30">
                <h4 className="font-bold text-scout-blue dark:text-blue-400 mb-2">Come funziona l'archivio?</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Questo storico è indipendente dal calendario operativo annuale. Serve per creare la memoria storica del gruppo. Tutti i Capi possono contribuire ad aggiungere eventi del passato (backfilling).
                </p>
            </div>
        </div>
    );
}
