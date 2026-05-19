import { useState, useEffect, useMemo } from 'react';
import { Archive, Plus, MapPin, Calendar, Trash2, X, Send, ChevronDown, Layers } from 'lucide-react';
import { getStorico, salvaEventoStorico, eliminaEventoStorico, EventoStorico } from '@/lib/storico';
import { getUser } from '@/lib/data';
import { User as UserType } from '@/types';
import { addPointsWithStats } from '@/lib/gamification';

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
    const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

    const toggleYear = (year: number) => {
        setExpandedYears(prev => ({
            ...prev,
            [year]: !prev[year]
        }));
    };

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
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // Portiamo il mese a 1-12 per chiarezza
        
        // Se il mese è >= 10 (Ottobre), l'anno associativo è quello dell'anno in corso
        // Se il mese è < 10 (Gen-Set), l'anno associativo è quello dell'anno precedente
        return month >= 10 ? year : year - 1;
    };

    useEffect(() => {
        getUser().then(setCurrentUser).catch(console.error);
        reload();
    }, []);

    // Aggiorna l'anno scout automaticamente quando cambia la data di inizio
    useEffect(() => {
        if (dataInizio) {
            setAnnoScout(calculateScoutYear(dataInizio));
        }
    }, [dataInizio]);

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
        
        if (!editId) {
            addPointsWithStats(5, { storicoItemsAdded: 1 }).catch(console.error);
        }
        
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

    // Grouping by branch within year for the pivot view
    const getEventsByBranch = (yearEvents: EventoStorico[]) => {
        const branches: Record<string, EventoStorico[]> = {};
        yearEvents.forEach(e => {
            if (!branches[e.branca]) branches[e.branca] = [];
            branches[e.branca].push(e);
        });
        return branches;
    };

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

            {/* Timeline Pivot View */}
            <div className="space-y-4">
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
                    sortedYears.map(year => {
                        const isExpanded = expandedYears[year];
                        const eventsByBranch = getEventsByBranch(groupedEvents[year]);
                        const branchOrder = ['L/C', 'E/G', 'R/S', 'CoCa', 'Gruppo'];

                        return (
                            <div key={year} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-300">
                                {/* Year Header / Toggle */}
                                <button
                                    onClick={() => toggleYear(year)}
                                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-scout-blue text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                            <Calendar size={24} />
                                        </div>
                                        <div className="text-left">
                                            <h2 className="text-xl font-black text-gray-900 dark:text-white leading-none">
                                                {year} — {year + 1}
                                            </h2>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter mt-1">
                                                {groupedEvents[year].length} ATTIVITÀ REGISTRATE
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-700 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown size={20} className="text-gray-500 dark:text-gray-400" />
                                    </div>
                                </button>

                                {/* Pivot Content */}
                                {isExpanded && (
                                    <div className="px-6 pb-8 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-10">
                                            {branchOrder.map(branch => {
                                                const branchEvents = eventsByBranch[branch];
                                                if (!branchEvents) return null;
                                                const dotColor = BRANCH_COLORS[branch] || '#9CA3AF';

                                                return (
                                                    <section key={branch} className="relative">
                                                        <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm py-2 z-10">
                                                            <div className="w-2 h-6 rounded-full" style={{ backgroundColor: dotColor }}></div>
                                                            <h3 className="text-lg font-black tracking-tight dark:text-white flex items-center gap-2">
                                                                {branch}
                                                                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-gray-500">
                                                                    {branchEvents.length}
                                                                </span>
                                                            </h3>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {branchEvents.map(ev => {
                                                                const isOwn = ev.autoreId === currentUser?.id;
                                                                return (
                                                                    <div key={ev.id} className="group relative bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                                                                        <div className="flex justify-between items-start gap-3">
                                                                            <div className="space-y-1">
                                                                                <p className="text-[10px] font-black text-scout-blue dark:text-blue-400 uppercase tracking-widest leading-none">
                                                                                    {ev.tipoEvento}
                                                                                </p>
                                                                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                                                    <MapPin size={14} className="text-gray-400" />
                                                                                    {ev.luogoNome}
                                                                                </h4>
                                                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                                                    <Calendar size={12} />
                                                                                    {new Date(ev.dataInizio).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                                                                                    {ev.dataFine && ` - ${new Date(ev.dataFine).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`}
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div className="flex gap-1">
                                                                                <button 
                                                                                    onClick={() => openEdit(ev)} 
                                                                                    className="p-1.5 text-gray-400 hover:text-scout-blue hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all"
                                                                                    title="Modifica"
                                                                                >
                                                                                    <Layers size={14} />
                                                                                </button>
                                                                                {isOwn && (
                                                                                    <button 
                                                                                        onClick={() => handleDelete(ev.id)} 
                                                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all"
                                                                                        title="Elimina"
                                                                                    >
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {ev.autoreNome && (
                                                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2 opacity-60">
                                                                                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[8px] font-bold text-scout-blue">
                                                                                    {ev.autoreNome.charAt(0)}
                                                                                </div>
                                                                                <span className="text-[10px] font-medium text-gray-500 italic">
                                                                                    Memoria di {ev.autoreNome}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </section>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
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
