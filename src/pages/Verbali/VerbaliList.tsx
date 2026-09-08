import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Search, Calendar, MapPin, User as UserIcon, Filter, X, Settings, RotateCw, AlertTriangle, ChevronDown } from 'lucide-react';
import { getVerbali, calculateScoutYear, formatScoutYear } from '@/lib/verbali';
import { getUser } from '@/lib/data';
import { Verbale, User } from '@/types';
import { cn } from '@/lib/utils';

export default function VerbaliList() {
    const [verbali, setVerbali] = useState<Verbale[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [hasOspite, setHasOspite] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

    const loadData = async () => {
        try {
            const [u, data] = await Promise.all([
                getUser().catch(() => null),
                getVerbali()
            ]);
            if (u) setCurrentUser(u);
            setVerbali(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getVerbaleScoutYear = (v: Verbale): number => {
        return v.annoScout ?? calculateScoutYear(v.data);
    };

    const scoutYears = useMemo(() => {
        const years = Array.from(new Set(verbali.map(getVerbaleScoutYear)));
        return years.sort((a, b) => b - a);
    }, [verbali]);

    const filteredVerbali = useMemo(() => {
        return verbali.filter(v => {
            const matchesSearch = 
                v.titolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.luogo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.numero.toString().includes(searchTerm) ||
                v.odg?.some(p => p.titolo.toLowerCase().includes(searchTerm.toLowerCase()) || p.contenuto.toLowerCase().includes(searchTerm.toLowerCase())) ||
                v.cassa?.some(c => c.note.toLowerCase().includes(searchTerm.toLowerCase()) || c.branca.toLowerCase().includes(searchTerm.toLowerCase())) ||
                v.varie?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const date = new Date(v.data);
            const vScoutYear = getVerbaleScoutYear(v);
            const matchesYear = selectedYear === 'all' || vScoutYear.toString() === selectedYear;
            const matchesMonth = selectedMonth === 'all' || (date.getMonth() + 1).toString().padStart(2, '0') === selectedMonth;
            const vHasOspite = v.ospiti && v.ospiti.length > 0;
            const matchesOspite = hasOspite === 'all' || (hasOspite === 'yes' ? vHasOspite : !vHasOspite);
            
            return matchesSearch && matchesYear && matchesMonth && matchesOspite;
        });
    }, [verbali, searchTerm, selectedYear, selectedMonth, hasOspite]);

    const groupedVerbali = useMemo(() => {
        const groups: Record<number, Verbale[]> = {};
        filteredVerbali.forEach(v => {
            const y = getVerbaleScoutYear(v);
            if (!groups[y]) groups[y] = [];
            groups[y].push(v);
        });
        Object.keys(groups).forEach(y => {
            groups[Number(y)].sort((a, b) => {
                const dateComp = (b.data || '').localeCompare(a.data || '');
                if (dateComp !== 0) return dateComp;
                return (b.numero || 0) - (a.numero || 0);
            });
        });
        return groups;
    }, [filteredVerbali]);

    const sortedYears = useMemo(() => {
        return Object.keys(groupedVerbali).map(Number).sort((a, b) => b - a);
    }, [groupedVerbali]);

    // Expand newest year by default, or all years when searching
    useEffect(() => {
        if (sortedYears.length > 0) {
            setExpandedYears(prev => {
                if (searchTerm.trim()) {
                    const allOpen: Record<number, boolean> = {};
                    sortedYears.forEach(y => { allOpen[y] = true; });
                    return allOpen;
                }
                if (Object.keys(prev).length === 0) {
                    return { [sortedYears[0]]: true };
                }
                return prev;
            });
        }
    }, [sortedYears, searchTerm]);

    const toggleYear = (year: number) => {
        setExpandedYears(prev => ({
            ...prev,
            [year]: !prev[year]
        }));
    };

    const months = [
        { value: '01', label: 'Gennaio' }, { value: '02', label: 'Febbraio' }, { value: '03', label: 'Marzo' },
        { value: '04', label: 'Aprile' }, { value: '05', label: 'Maggio' }, { value: '06', label: 'Giugno' },
        { value: '07', label: 'Luglio' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Settembre' },
        { value: '10', label: 'Ottobre' }, { value: '11', label: 'Novembre' }, { value: '12', label: 'Dicembre' }
    ];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="bg-scout-brown dark:bg-amber-950/60 text-white p-6 rounded-2xl shadow-lg -mx-4 md:mx-0 rounded-t-none md:rounded-2xl flex items-center justify-between dark:border dark:border-amber-900/50">
                <div>
                    <h1 className="text-3xl font-bold mb-1 drop-shadow-sm">Archivio Verbali</h1>
                    <p className="opacity-90 text-sm drop-shadow-sm">Diario di Bordo della Comunità Capi</p>
                </div>
                <FileText size={48} className="opacity-20 hidden md:block" />
            </div>

            {/* Group Missing Warning */}
            {currentUser && !currentUser.groupId && !currentUser.groupName && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-sm shadow-sm">
                    <AlertTriangle size={20} className="shrink-0 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold">Nessun Gruppo Scout associato al tuo profilo</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                            Per visualizzare e sincronizzare i verbali della tua Comunità Capi su tutti i tuoi dispositivi (PC e telefono), imposta la tua Regione, Zona e Gruppo Scout nel profilo.
                        </p>
                    </div>
                    <Link to="/profile" className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shrink-0 transition-colors shadow-sm">
                        Imposta Gruppo
                    </Link>
                </div>
            )}

            {/* Actions & Search */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Cerca in titoli, ODG, cassa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-scout-green shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setRefreshing(true); loadData(); }}
                            disabled={refreshing || loading}
                            className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-scout-brown/10 dark:border-gray-700 shadow-sm hover:border-scout-brown/30 dark:hover:border-gray-600 text-scout-brown dark:text-gray-300 hover:bg-scout-brown/5 dark:hover:bg-gray-700 transition-all outline-none"
                            title="Ricarica elenco verbali"
                        >
                            <RotateCw size={20} className={cn(refreshing ? "animate-spin text-scout-green" : "")} />
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "px-4 py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 relative",
                                showFilters || selectedYear !== 'all' || selectedMonth !== 'all' || hasOspite !== 'all'
                                    ? "bg-scout-green/10 dark:bg-emerald-900/30 border-scout-green dark:border-emerald-500 text-scout-green dark:text-emerald-500"
                                    : "bg-white dark:bg-gray-800 border-scout-brown/10 dark:border-gray-700 text-scout-brown dark:text-gray-300 hover:border-scout-brown/30 dark:hover:border-gray-600"
                            )}
                        >
                            <Filter size={20} />
                            {(selectedYear !== 'all' || selectedMonth !== 'all' || hasOspite !== 'all') && (
                                <span className="absolute -top-2 -right-2 w-5 h-5 bg-scout-green dark:bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm">
                                    { [selectedYear, selectedMonth, hasOspite].filter(f => f !== 'all').length }
                                </span>
                            )}
                        </button>
                        <Link
                            to="/verbali/impostazioni"
                            className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-scout-brown/10 dark:border-gray-700 shadow-sm hover:border-scout-brown/30 dark:hover:border-gray-600 text-scout-brown dark:text-gray-300 hover:bg-scout-brown/5 dark:hover:bg-gray-700 transition-all outline-none"
                            title="Personalizza Intestazione"
                        >
                            <Settings size={20} />
                        </Link>
                        <Link
                            to="/verbali/statistiche"
                            className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-scout-brown/10 dark:border-gray-700 shadow-sm hover:border-scout-brown/30 dark:hover:border-gray-600 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-gray-700 transition-all outline-none"
                            title="Reportistica Presenze"
                        >
                            <FileText size={20} />
                        </Link>
                        <Link
                            to="/verbali/membri"
                            className="bg-white dark:bg-gray-800 text-scout-brown dark:text-gray-300 px-4 py-3 rounded-xl font-bold border-2 border-scout-brown/10 dark:border-gray-700 shadow-sm hover:border-scout-brown/30 dark:hover:border-gray-600 transition-all flex items-center justify-center gap-2"
                        >
                            <UserIcon size={20} />
                            <span className="hidden sm:inline">Membri</span>
                        </Link>
                        <Link
                            to="/verbali/nuovo"
                            className="bg-scout-green dark:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-scout-green-dark dark:hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline">Nuovo</span>
                        </Link>
                    </div>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Filter size={12} />
                                Filtri Avanzati
                            </h3>
                            {(selectedYear !== 'all' || selectedMonth !== 'all' || hasOspite !== 'all' || searchTerm !== '') && (
                                <button 
                                    onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); setHasOspite('all'); setSearchTerm(''); }}
                                    className="text-[10px] font-bold text-red-400 hover:text-red-500 flex items-center gap-1"
                                >
                                    <X size={12} />
                                    Reset
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 ml-1">Anno Scout</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-scout-green text-gray-900 dark:text-gray-100"
                                >
                                    <option value="all">Tutti gli anni</option>
                                    {scoutYears.map(y => (
                                        <option key={y} value={y.toString()}>{formatScoutYear(y)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 ml-1">Mese</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-scout-green text-gray-900 dark:text-gray-100"
                                >
                                    <option value="all">Tutti i mesi</option>
                                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 ml-1">Ospite</label>
                                <select
                                    value={hasOspite}
                                    onChange={(e) => setHasOspite(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-scout-green text-gray-900 dark:text-gray-100"
                                >
                                    <option value="all">Sia con che senza</option>
                                    <option value="yes">Con Ospite</option>
                                    <option value="no">Senza Ospite</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Grouped Accordion List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        Caricamento verbali...
                    </div>
                ) : sortedYears.length === 0 ? (
                    <div className="p-8 md:p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 space-y-4">
                        <div className="max-w-md mx-auto space-y-2">
                            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
                                {searchTerm ? 'Nessuna corrispondenza trovata con i filtri correnti.' : 'Nessun verbale presente in archivio per il tuo gruppo.'}
                            </p>
                            {currentUser && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 space-y-1 text-left">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Account collegato:</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{currentUser.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Gruppo scout:</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{currentUser.groupName || 'Non impostato'}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 pt-1">
                                        Nota: Se hai salvato dei verbali da telefono con un account o un gruppo scout diverso, assicurati di effettuare l'accesso con lo stesso account o imposta il gruppo corretto.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center gap-3 pt-2">
                            <button
                                onClick={() => { setRefreshing(true); loadData(); }}
                                className="px-4 py-2 text-xs font-bold text-scout-green bg-green-50 dark:bg-green-950/40 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors border border-green-200 dark:border-green-800/50"
                            >
                                {refreshing ? 'Aggiornamento...' : 'Ricarica Elenco'}
                            </button>
                            <Link
                                to="/profile"
                                className="px-4 py-2 text-xs font-bold text-scout-brown dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-800/50"
                            >
                                Verifica Profilo
                            </Link>
                        </div>
                    </div>
                ) : (
                    sortedYears.map((year) => {
                        const isExpanded = !!expandedYears[year];
                        const yearVerbali = groupedVerbali[year] || [];

                        return (
                            <div
                                key={year}
                                className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-300"
                            >
                                {/* Year Accordion Header */}
                                <button
                                    type="button"
                                    onClick={() => toggleYear(year)}
                                    className="w-full flex items-center justify-between p-5 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="bg-scout-brown/90 dark:bg-amber-900/80 text-white w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shadow-amber-900/10 shrink-0">
                                            <Calendar size={22} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                                                Anno Associativo {formatScoutYear(year)}
                                            </h2>
                                            <p className="text-xs font-bold text-scout-brown/70 dark:text-amber-400/80 uppercase tracking-tight mt-0.5">
                                                {yearVerbali.length} {yearVerbali.length === 1 ? 'verbale archiviato' : 'verbali archiviati'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "p-2 rounded-full bg-gray-100 dark:bg-gray-700 transition-transform duration-300",
                                        isExpanded ? "rotate-180 bg-scout-green/10 text-scout-green dark:bg-emerald-900/40 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"
                                    )}>
                                        <ChevronDown size={18} />
                                    </div>
                                </button>

                                {/* Verbali list in expanded accordion */}
                                {isExpanded && (
                                    <div className="px-5 pb-5 pt-1 space-y-3 border-t border-gray-100/80 dark:border-gray-700/60 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {yearVerbali.map((v) => (
                                            <Link
                                                key={v.id}
                                                to={`/verbali/visualizza/${v.id}`}
                                                className="bg-gray-50/70 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/80 hover:border-scout-green/40 dark:hover:border-scout-green/50 hover:bg-white dark:hover:bg-gray-800 shadow-sm hover:shadow transition-all group block"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-scout-green dark:text-scout-green-light bg-green-50 dark:bg-green-900/30 px-2.5 py-0.5 rounded-full border border-green-100 dark:border-green-800 uppercase mb-1.5 inline-block">
                                                            Verbale N. {v.numero}
                                                        </span>
                                                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-scout-green transition-colors">
                                                            {v.titolo}
                                                        </h3>
                                                    </div>
                                                    <Calendar size={16} className="text-gray-300 dark:text-gray-600 shrink-0 mt-1" />
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-100/60 dark:border-gray-800">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar size={13} className="text-gray-400" />
                                                        <span>{new Date(v.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                    </div>
                                                    {v.luogo && (
                                                        <div className="flex items-center gap-1">
                                                            <MapPin size={13} className="text-gray-400" />
                                                            <span>{v.luogo}</span>
                                                        </div>
                                                    )}
                                                    {v.presenti && v.presenti.length > 0 && (
                                                        <div className="flex items-center gap-1 text-[11px] text-scout-green font-medium">
                                                            <span>• {v.presenti.length} presenti</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1 ml-auto text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-100 dark:border-gray-700">
                                                        <UserIcon size={11} />
                                                        <span>Caricato da {v.createdByName || 'Admin'}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
