import { useEffect, useState } from 'react';
import { Search, Filter, Plus, X, Check, Clock, Tent, BedDouble, Bus, Flame, Droplets, Home as HomeIcon } from 'lucide-react';
import { getLocations, getUser, getUserLocationViews, getAllLocationHistory } from '@/lib/data';
import { Location, User as UserType } from '@/types';
import LocationCard from '@/components/LocationCard';
import InteractiveMap from '@/components/InteractiveMap';
import TransportModal from '@/components/TransportModal';
import { Link } from 'react-router-dom';
import { cn, getStalenessInfo } from '@/lib/utils';
import { addPointsWithStats } from '@/lib/gamification';

const ITALIAN_REGIONS = [
    "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
    "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardia", "Marche",
    "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia", "Toscana",
    "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto"
];

const BRANCH_ACTIVITIES: Record<string, string[]> = {
    'L/C': ['Caccia giungla', 'Caccia primaverile', 'Caccia di Accettazione', 'Caccia invernale', 'Vacanze di Branco'],
    'E/G': ['Campo invernale', 'Campo primaverile', 'San Giorgio', 'Campo estivo'],
    'R/S': ['Route invernale', 'Route primaverile', 'Route estiva'],
    'Co.Ca.': ['Pernotto comunità capi'],
    'Gruppo': ['Uscita di apertura', 'Campo di gruppo']
};

const STALENESS_LEVELS = [
    { level: 0, color: 'bg-green-500', label: 'Recente (<1a)' },
    { level: 1, color: 'bg-yellow-500', label: 'Da verif. (1-2a)' },
    { level: 2, color: 'bg-orange-500', label: 'Incerto (2-3a)' },
    { level: 3, color: 'bg-red-500', label: 'Datato (>3a)' }
];

interface HomeProps {
    defaultView?: 'list' | 'map';
}

export default function Home({ defaultView = 'list' }: HomeProps) {
    const [locations, setLocations] = useState<Location[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>(defaultView);
    const [showFilters, setShowFilters] = useState(false);

    // Advanced Filters State
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [hasTents, setHasTents] = useState(false);
    const [hasBeds, setHasBeds] = useState(false);
    const [minBeds, setMinBeds] = useState<number | null>(null);
    const [hasAccantonamento, setHasAccantonamento] = useState(false);
    const [minAccantonamento, setMinAccantonamento] = useState<number | null>(null);
    const [hasHeating, setHasHeating] = useState(false);
    const [hasWaterPoints, setHasWaterPoints] = useState(false);
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
    const [selectedStaleness, setSelectedStaleness] = useState<number[]>([]);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [locationViews, setLocationViews] = useState<Record<string, string>>({});
    const [histories, setHistories] = useState<any[]>([]);
    const [showTransportModal, setShowTransportModal] = useState(false);

    useEffect(() => {
        getLocations().then(setLocations).catch(console.error);
        getUser().then(setCurrentUser).catch(console.error);
        getUserLocationViews().then(setLocationViews).catch(console.error);
        getAllLocationHistory().then(setHistories).catch(console.error);

        const params = new URLSearchParams(window.location.search);
        if (params.get('transport') === 'true') {
            setShowTransportModal(true);
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, []);

    const getUnreadCount = (locationId: string) => {
        if (!currentUser) return 0;
        const lastViewedAt = locationViews[locationId];
        const locHistories = histories.filter(h => h.location_id === locationId);
        
        return locHistories.filter(h => {
            if (h.user_id === currentUser.id) return false;
            
            const editTime = new Date(h.created_at).getTime();
            const viewTime = lastViewedAt ? new Date(lastViewedAt).getTime() : 0;
            return editTime > viewTime;
        }).length;
    };

    const toggleSelection = (list: any[], item: any, setList: (l: any[]) => void) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const filteredLocations = locations.filter(loc => {
        // 1. Search
        const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.commune.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.region.toLowerCase().includes(searchTerm.toLowerCase());

        // 2. Tents, Beds, Accantonamento, Heating & Water Points
        const matchesTents = hasTents ? loc.hasTents : true;
        let matchesBeds = true;
        if (minBeds !== null && minBeds > 0) {
            matchesBeds = (loc.beds || 0) >= minBeds;
        } else if (hasBeds) {
            matchesBeds = (loc.beds || 0) > 0;
        }

        let matchesAccantonamento = true;
        if (minAccantonamento !== null && minAccantonamento > 0) {
            matchesAccantonamento = (loc.accantonamentoCapacity || 0) >= minAccantonamento;
        } else if (hasAccantonamento) {
            matchesAccantonamento = (loc.accantonamentoCapacity || 0) > 0;
        }

        const matchesHeating = hasHeating ? !!loc.hasHeating : true;
        const matchesWaterPoints = hasWaterPoints ? !!loc.hasWaterPoints : true;

        // 3. Regions
        const matchesRegion = selectedRegions.length > 0 ? selectedRegions.includes(loc.region) : true;

        // 4. Branches & Activities
        let matchesBranch = true;
        if (selectedBranches.length > 0) {
            const validActivitiesForBranches = selectedBranches.flatMap(branch => BRANCH_ACTIVITIES[branch]);
            matchesBranch = loc.activities.some(act => validActivitiesForBranches.includes(act));
        }

        let matchesActivity = true;
        if (selectedActivities.length > 0) {
            matchesActivity = loc.activities.some(act => selectedActivities.includes(act));
        }

        // 5. Staleness
        let matchesStaleness = true;
        if (selectedStaleness.length > 0) {
            const info = getStalenessInfo(loc.lastUpdatedAt);
            matchesStaleness = selectedStaleness.includes(info.level);
        }

        return matchesSearch && matchesTents && matchesBeds && matchesAccantonamento && matchesHeating && matchesWaterPoints && matchesRegion && 
               matchesBranch && matchesActivity && matchesStaleness;
    });

    const activeFiltersCount =
        selectedBranches.length +
        selectedRegions.length +
        selectedActivities.length +
        selectedStaleness.length +
        (hasTents ? 1 : 0) +
        ((minBeds !== null && minBeds > 0) || hasBeds ? 1 : 0) +
        ((minAccantonamento !== null && minAccantonamento > 0) || hasAccantonamento ? 1 : 0) +
        (hasHeating ? 1 : 0) +
        (hasWaterPoints ? 1 : 0);

    return (
        <div className="space-y-6 relative min-h-[calc(100vh-150px)] pb-20">
            {/* Header Section */}
            <div className="bg-scout-green dark:bg-green-900/60 dark:border dark:border-green-800/50 text-white p-6 rounded-2xl shadow-lg -mx-4 md:mx-0 rounded-t-none md:rounded-2xl backdrop-blur-sm">
                <h1 className="text-3xl font-bold mb-2">Esplora Luoghi</h1>
                <p className="opacity-90">Trova il posto perfetto per la tua prossima caccia o campo.</p>

                <div className="mt-6 flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Search size={20} className="text-scout-green" />
                        </div>
                        {/* Improved Contrast: White background with dark text */}
                        <input
                            type="text"
                            placeholder="Cerca per nome, comune..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (!sessionStorage.getItem('search_done') && e.target.value.length > 2) {
                                    sessionStorage.setItem('search_done', '1');
                                    
                                    const stats: any = { locationsSearched: 1 };
                                    // If branch filters are active, count them too
                                    selectedBranches.forEach(branch => {
                                        if (branch === 'L/C') stats.searchesLC = (stats.searchesLC || 0) + 1;
                                        if (branch === 'E/G') stats.searchesEG = (stats.searchesEG || 0) + 1;
                                        if (branch === 'R/S') stats.searchesRS = (stats.searchesRS || 0) + 1;
                                        if (branch === 'Co.Ca.') stats.searchesCoCa = (stats.searchesCoCa || 0) + 1;
                                        if (branch === 'Gruppo') stats.searchesGruppo = (stats.searchesGruppo || 0) + 1;
                                    });

                                    addPointsWithStats(1, stats).catch(console.error);
                                }
                            }}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-gray-800 dark:text-gray-100 dark:border dark:border-green-700/50 text-gray-900 focus:outline-none focus:ring-4 focus:ring-scout-green-light/50 shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Link to="/add" className="bg-scout-blue dark:bg-scout-blue-dark text-white p-3 rounded-xl shadow-md active:scale-95 transition-transform flex items-center justify-center border-2 border-white/20 dark:border-white/10 aspect-square">
                            <Plus size={24} />
                        </Link>
                        <button
                            onClick={() => setShowFilters(true)}
                            className={cn(
                                "p-3 rounded-xl shadow-md active:scale-95 transition-transform flex items-center justify-center border-2 border-white/20 dark:border-white/10 relative aspect-square",
                                activeFiltersCount > 0 ? "bg-scout-brown text-white" : "bg-white dark:bg-gray-800 text-scout-green dark:text-green-500"
                            )}
                        >
                            <Filter size={24} />
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Modal */}
            {showFilters && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                            <h2 className="text-2xl font-bold text-scout-green dark:text-green-500">Filtri</h2>
                            <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"><X size={24} /></button>
                        </div>

                        {/* 0. Stato Dati */}
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Clock size={16} className="text-scout-brown dark:text-amber-500" /> Stato Aggiornamento Dati
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {STALENESS_LEVELS.map(s => (
                                    <button
                                        key={s.level}
                                        onClick={() => toggleSelection(selectedStaleness, s.level, setSelectedStaleness)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-bold border transition-all",
                                            selectedStaleness.includes(s.level)
                                                ? "bg-gray-900 dark:bg-gray-105 text-white dark:text-gray-900 border-gray-900 dark:border-gray-105 shadow-md"
                                                : "bg-white dark:bg-gray-700 text-gray-650 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:bg-gray-650"
                                        )}
                                    >
                                        <div className={cn("w-3 h-3 rounded-full shrink-0", s.color)} />
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 1. Branche */}
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Filtra per Branca</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(BRANCH_ACTIVITIES).map(branch => (
                                    <button
                                        key={branch}
                                        onClick={() => toggleSelection(selectedBranches, branch, setSelectedBranches)}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-xs font-bold border transition-all",
                                            selectedBranches.includes(branch)
                                                ? "bg-scout-green text-white border-scout-green shadow-sm"
                                                : "bg-white dark:bg-gray-700 text-gray-605 dark:text-gray-350 border-gray-200 dark:border-gray-650 hover:bg-gray-55 dark:hover:bg-gray-600"
                                        )}
                                    >
                                        {branch}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 1b. Attività specifiche */}
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Attività Specifica</h3>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(Object.values(BRANCH_ACTIVITIES).flat())).sort().map(activity => (
                                    <button
                                        key={activity}
                                        onClick={() => toggleSelection(selectedActivities, activity, setSelectedActivities)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                                            selectedActivities.includes(activity)
                                                ? "bg-scout-blue text-white border-scout-blue"
                                                : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-600 hover:border-scout-blue/30"
                                        )}
                                    >
                                        {activity}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Logistica, Posti Letto & Accantonamento */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                                    <BedDouble size={18} className="text-scout-blue" /> Logistica e Posti al Chiuso
                                </h3>
                                {(minBeds !== null || hasBeds || minAccantonamento !== null || hasAccantonamento || hasTents || hasHeating || hasWaterPoints) && (
                                    <button
                                        type="button"
                                        onClick={() => { 
                                            setMinBeds(null); 
                                            setHasBeds(false); 
                                            setMinAccantonamento(null); 
                                            setHasAccantonamento(false); 
                                            setHasTents(false); 
                                            setHasHeating(false); 
                                            setHasWaterPoints(false); 
                                        }}
                                        className="text-xs text-red-500 font-bold hover:underline cursor-pointer"
                                    >
                                        Azzera
                                    </button>
                                )}
                            </div>

                            {/* Checkbox Tende / Letti / Accantonamento / Riscaldamento / Punti d'acqua */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                <label className={cn(
                                    "flex items-center justify-center gap-1.5 p-2.5 border rounded-xl cursor-pointer transition-all text-xs font-bold",
                                    hasTents 
                                        ? "bg-green-50 dark:bg-emerald-950/20 border-green-500 text-green-700 dark:text-emerald-400" 
                                        : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300"
                                )}>
                                    <input type="checkbox" checked={hasTents} onChange={e => setHasTents(e.target.checked)} className="hidden" />
                                    <span>🏕️ Tende</span>
                                </label>
                                <label className={cn(
                                    "flex items-center justify-center gap-1.5 p-2.5 border rounded-xl cursor-pointer transition-all text-xs font-bold",
                                    hasBeds || (minBeds !== null && minBeds > 0)
                                        ? "bg-blue-50 dark:bg-blue-950/30 border-scout-blue text-scout-blue" 
                                        : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300"
                                )}>
                                    <input
                                        type="checkbox"
                                        checked={hasBeds || (minBeds !== null && minBeds > 0)}
                                        onChange={e => {
                                            setHasBeds(e.target.checked);
                                            if (!e.target.checked) setMinBeds(null);
                                        }}
                                        className="hidden"
                                    />
                                    <span>🛏️ Letti</span>
                                </label>
                                <label className={cn(
                                    "flex items-center justify-center gap-1.5 p-2.5 border rounded-xl cursor-pointer transition-all text-xs font-bold",
                                    hasAccantonamento || (minAccantonamento !== null && minAccantonamento > 0)
                                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-800 dark:text-amber-300" 
                                        : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300"
                                )}>
                                    <input
                                        type="checkbox"
                                        checked={hasAccantonamento || (minAccantonamento !== null && minAccantonamento > 0)}
                                        onChange={e => {
                                            setHasAccantonamento(e.target.checked);
                                            if (!e.target.checked) setMinAccantonamento(null);
                                        }}
                                        className="hidden"
                                    />
                                    <span>🏠 Accantonamento</span>
                                </label>
                                <label className={cn(
                                    "flex items-center justify-center gap-1.5 p-2.5 border rounded-xl cursor-pointer transition-all text-xs font-bold",
                                    hasHeating
                                        ? "bg-orange-50 dark:bg-orange-950/30 border-orange-500 text-orange-700 dark:text-orange-300" 
                                        : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300"
                                )}>
                                    <input
                                        type="checkbox"
                                        checked={hasHeating}
                                        onChange={e => setHasHeating(e.target.checked)}
                                        className="hidden"
                                    />
                                    <span>🔥 Riscaldato</span>
                                </label>
                                <label className={cn(
                                    "flex items-center justify-center gap-1.5 p-2.5 border rounded-xl cursor-pointer transition-all text-xs font-bold",
                                    hasWaterPoints
                                        ? "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-500 text-cyan-700 dark:text-cyan-300" 
                                        : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300"
                                )}>
                                    <input
                                        type="checkbox"
                                        checked={hasWaterPoints}
                                        onChange={e => setHasWaterPoints(e.target.checked)}
                                        className="hidden"
                                    />
                                    <span>🚰 Punti d'acqua</span>
                                </label>
                            </div>

                            {/* Filtro specifico per Numero Posti Letto Minimi */}
                            <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-150 dark:border-gray-650 space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                        <BedDouble size={15} className="text-scout-blue" />
                                        Posti letto minimi (brandina/materasso):
                                    </span>
                                    {minBeds !== null && minBeds > 0 && (
                                        <span className="text-[11px] font-black text-scout-blue bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/40">
                                            Almeno {minBeds} letti
                                        </span>
                                    )}
                                </div>

                                {/* Preset rapidi */}
                                <div className="grid grid-cols-5 gap-1.5">
                                    {[
                                        { label: 'Tutti', val: null },
                                        { label: '10+', val: 10 },
                                        { label: '20+', val: 20 },
                                        { label: '30+', val: 30 },
                                        { label: '50+', val: 50 },
                                    ].map(preset => {
                                        const isSelected = preset.val === null ? (minBeds === null) : minBeds === preset.val;
                                        return (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() => {
                                                    if (preset.val === null) {
                                                        setMinBeds(null);
                                                    } else {
                                                        setMinBeds(preset.val);
                                                        setHasBeds(true);
                                                    }
                                                }}
                                                className={cn(
                                                    "py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer",
                                                    isSelected
                                                        ? "bg-scout-blue text-white border-scout-blue shadow-sm"
                                                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-scout-blue/40"
                                                )}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Stepper numerico personalizzato */}
                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                        Oppure imposta numero esatto letti:
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = minBeds || 0;
                                                const next = Math.max(0, current - 5);
                                                setMinBeds(next === 0 ? null : next);
                                                if (next === 0) setHasBeds(false);
                                            }}
                                            disabled={!minBeds || minBeds <= 0}
                                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min={0}
                                            max={500}
                                            placeholder="0"
                                            value={minBeds ?? ''}
                                            onChange={e => {
                                                const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                                if (val === null || isNaN(val) || val <= 0) {
                                                    setMinBeds(null);
                                                } else {
                                                    setMinBeds(val);
                                                    setHasBeds(true);
                                                }
                                            }}
                                            className="w-16 py-1 px-1.5 text-center font-mono font-bold text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-scout-blue"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = minBeds || 0;
                                                const next = current + 5;
                                                setMinBeds(next);
                                                setHasBeds(true);
                                            }}
                                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Filtro specifico per Numero Posti Accantonamento Minimi */}
                            <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                        <HomeIcon size={15} className="text-amber-600 dark:text-amber-400" />
                                        Posti accantonamento minimi (a terra):
                                    </span>
                                    {minAccantonamento !== null && minAccantonamento > 0 && (
                                        <span className="text-[11px] font-black text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                                            Almeno {minAccantonamento} a terra
                                        </span>
                                    )}
                                </div>

                                {/* Preset rapidi accantonamento */}
                                <div className="grid grid-cols-5 gap-1.5">
                                    {[
                                        { label: 'Tutti', val: null },
                                        { label: '15+', val: 15 },
                                        { label: '25+', val: 25 },
                                        { label: '40+', val: 40 },
                                        { label: '60+', val: 60 },
                                    ].map(preset => {
                                        const isSelected = preset.val === null ? (minAccantonamento === null) : minAccantonamento === preset.val;
                                        return (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() => {
                                                    if (preset.val === null) {
                                                        setMinAccantonamento(null);
                                                    } else {
                                                        setMinAccantonamento(preset.val);
                                                        setHasAccantonamento(true);
                                                    }
                                                }}
                                                className={cn(
                                                    "py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer",
                                                    isSelected
                                                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-amber-500/40"
                                                )}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Stepper numerico personalizzato per accantonamento */}
                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                        Oppure imposta numero esatto accantonamento:
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = minAccantonamento || 0;
                                                const next = Math.max(0, current - 5);
                                                setMinAccantonamento(next === 0 ? null : next);
                                                if (next === 0) setHasAccantonamento(false);
                                            }}
                                            disabled={!minAccantonamento || minAccantonamento <= 0}
                                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min={0}
                                            max={500}
                                            placeholder="0"
                                            value={minAccantonamento ?? ''}
                                            onChange={e => {
                                                const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                                if (val === null || isNaN(val) || val <= 0) {
                                                    setMinAccantonamento(null);
                                                } else {
                                                    setMinAccantonamento(val);
                                                    setHasAccantonamento(true);
                                                }
                                            }}
                                            className="w-16 py-1 px-1.5 text-center font-mono font-bold text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = minAccantonamento || 0;
                                                const next = current + 5;
                                                setMinAccantonamento(next);
                                                setHasAccantonamento(true);
                                            }}
                                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Regioni */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-gray-900 dark:text-white">Regioni</h3>
                                {selectedRegions.length > 0 && (
                                    <button onClick={() => setSelectedRegions([])} className="text-xs text-red-500 font-bold hover:underline">
                                        Resetta ({selectedRegions.length})
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                                {ITALIAN_REGIONS.map(region => (
                                    <label
                                        key={region}
                                        onClick={() => toggleSelection(selectedRegions, region, setSelectedRegions)}
                                        className={cn(
                                            "flex items-center gap-2 p-3 rounded-xl cursor-pointer text-sm border transition-all duration-200",
                                            selectedRegions.includes(region)
                                                ? "bg-scout-green/10 dark:bg-emerald-950/30 border-scout-green text-scout-green-dark dark:text-emerald-400 font-bold"
                                                : "bg-gray-50 dark:bg-gray-700 border-gray-150 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-650"
                                        )}>
                                        <div className={cn(
                                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                            selectedRegions.includes(region) 
                                                ? "bg-scout-green border-scout-green" 
                                                : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800"
                                        )}>
                                            {selectedRegions.includes(region) && <Check size={10} className="text-white" />}
                                        </div>
                                        <span className="font-semibold">{region}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => {
                                    setShowFilters(false);
                                    // Track branch searches when applying filters
                                    if (selectedBranches.length > 0) {
                                        const stats: any = {};
                                        selectedBranches.forEach(branch => {
                                            const key = `search_track_${branch}`;
                                            if (!sessionStorage.getItem(key)) {
                                                sessionStorage.setItem(key, '1');
                                                if (branch === 'L/C') stats.searchesLC = 1;
                                                if (branch === 'E/G') stats.searchesEG = 1;
                                                if (branch === 'R/S') stats.searchesRS = 1;
                                                if (branch === 'Co.Ca.') stats.searchesCoCa = 1;
                                                if (branch === 'Gruppo') stats.searchesGruppo = 1;
                                            }
                                        });
                                        if (Object.keys(stats).length > 0) {
                                            addPointsWithStats(1, stats).catch(console.error);
                                        }
                                    }
                                }}
                                className="w-full bg-scout-green text-white font-bold py-4 rounded-xl shadow-lg hover:bg-scout-green-dark active:transform active:scale-[0.98] transition-all"
                            >
                                Applica Filtri ({activeFiltersCount})
                            </button>
                            {activeFiltersCount > 0 && (
                                <button
                                    onClick={() => {
                                        setSelectedBranches([]);
                                        setSelectedRegions([]);
                                        setSelectedActivities([]);
                                        setSelectedStaleness([]);
                                        setHasTents(false);
                                        setHasBeds(false);
                                        setMinBeds(null);
                                        setHasAccantonamento(false);
                                        setMinAccantonamento(null);
                                        setHasHeating(false);
                                        setHasWaterPoints(false);
                                    }}
                                    className="w-full mt-3 text-gray-500 dark:text-gray-400 font-medium py-2 hover:text-gray-900 dark:hover:text-white"
                                >
                                    Cancella tutto
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Active Filters Bar */}
            {activeFiltersCount > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 -mt-2 no-scrollbar">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        Filtri:
                    </span>
                    {minBeds !== null && minBeds > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-scout-blue border border-blue-200 dark:border-blue-800/50 whitespace-nowrap">
                            <BedDouble size={13} />
                            ≥ {minBeds} letti
                            <button
                                type="button"
                                onClick={() => { setMinBeds(null); setHasBeds(false); }}
                                className="hover:bg-blue-200/50 rounded-full p-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasBeds && (minBeds === null || minBeds === 0) && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 dark:bg-green-950/40 text-scout-green-dark dark:text-emerald-400 border border-green-200 dark:border-green-800/50 whitespace-nowrap">
                            <BedDouble size={13} />
                            Con letti
                            <button
                                type="button"
                                onClick={() => setHasBeds(false)}
                                className="hover:bg-green-200/50 rounded-full p-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {minAccantonamento !== null && minAccantonamento > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 whitespace-nowrap">
                            <HomeIcon size={13} />
                            ≥ {minAccantonamento} a terra
                            <button
                                type="button"
                                onClick={() => { setMinAccantonamento(null); setHasAccantonamento(false); }}
                                className="hover:bg-amber-200/50 rounded-full p-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasAccantonamento && (minAccantonamento === null || minAccantonamento === 0) && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 whitespace-nowrap">
                            <HomeIcon size={13} />
                            Accantonamento
                            <button
                                type="button"
                                onClick={() => setHasAccantonamento(false)}
                                className="hover:bg-amber-200/50 rounded-full p-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasTents && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 dark:bg-green-950/40 text-scout-green-dark dark:text-emerald-400 border border-green-200 dark:border-green-800/50 whitespace-nowrap">
                            <Tent size={13} />
                            Tende
                            <button
                                type="button"
                                onClick={() => setHasTents(false)}
                                className="hover:bg-green-200/50 rounded-full p-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasHeating && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50 whitespace-nowrap">
                            <Flame size={13} />
                            Riscaldato
                            <button
                                type="button"
                                onClick={() => setHasHeating(false)}
                                className="hover:bg-orange-200/50 rounded-full p-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasWaterPoints && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50 whitespace-nowrap">
                            <Droplets size={13} />
                            Punti d'acqua
                            <button
                                type="button"
                                onClick={() => setHasWaterPoints(false)}
                                className="hover:bg-cyan-200/50 rounded-full p-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {selectedBranches.map(b => (
                        <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                            {b}
                            <button
                                type="button"
                                onClick={() => toggleSelection(selectedBranches, b, setSelectedBranches)}
                                className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    {selectedRegions.map(r => (
                        <span key={r} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                            {r}
                            <button
                                type="button"
                                onClick={() => toggleSelection(selectedRegions, r, setSelectedRegions)}
                                className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    {selectedActivities.map(a => (
                        <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                            {a}
                            <button
                                type="button"
                                onClick={() => toggleSelection(selectedActivities, a, setSelectedActivities)}
                                className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedBranches([]);
                            setSelectedRegions([]);
                            setSelectedActivities([]);
                            setSelectedStaleness([]);
                            setHasTents(false);
                            setHasBeds(false);
                            setMinBeds(null);
                            setHasAccantonamento(false);
                            setMinAccantonamento(null);
                            setHasHeating(false);
                            setHasWaterPoints(false);
                        }}
                        className="text-xs text-red-500 dark:text-red-400 font-bold hover:underline whitespace-nowrap ml-1 cursor-pointer"
                    >
                        Azzera tutti
                    </button>
                </div>
            )}

             {/* View Toggle and Count Header */}
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm">
                <span className="text-sm font-extrabold text-gray-500 dark:text-gray-400">
                    Trovati {filteredLocations.length} luoghi
                </span>
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl shrink-0">
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-wider cursor-pointer",
                            viewMode === 'list'
                                ? "bg-white dark:bg-gray-800 text-scout-green-dark dark:text-emerald-400 shadow-sm"
                                : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        Lista
                    </button>
                    <button
                        onClick={() => setViewMode('map')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-wider cursor-pointer",
                            viewMode === 'map'
                                ? "bg-white dark:bg-gray-800 text-scout-green-dark dark:text-emerald-400 shadow-sm"
                                : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        Mappa
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {(currentUser ? filteredLocations : filteredLocations.slice(0, 5)).map((location) => (
                        <LocationCard 
                            key={location.id} 
                            location={location} 
                            unreadModificationsCount={getUnreadCount(location.id)} 
                        />
                    ))}

                    {/* Guest Invitation Message */}
                    {!currentUser && filteredLocations.length > 5 && (
                        <div className="col-span-full mt-8 p-8 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-scout-blue/30 text-center space-y-4 shadow-sm">
                            <div className="bg-scout-blue/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                <Plus className="text-scout-blue" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Vuoi vedere altri luoghi?</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-sm">
                                Iscriviti gratuitamente per accedere all'intero database di {locations.length} luoghi scout e iniziare a pianificare le tue attività!
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                                <Link to="/register" className="bg-scout-blue text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                                    Registrati ora
                                </Link>
                                <Link to="/login" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                                    Accedi
                                </Link>
                            </div>
                        </div>
                    )}

                    {filteredLocations.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                            <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-full mb-4">
                                <Search size={48} className="text-gray-400 dark:text-gray-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nessun luogo trovato</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">Prova a modificare i filtri o cerca qualcosa di diverso.</p>
                            {activeFiltersCount > 0 && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedBranches([]);
                                        setSelectedRegions([]);
                                        setSelectedActivities([]);
                                        setSelectedStaleness([]);
                                        setHasTents(false);
                                        setHasBeds(false);
                                        setMinBeds(null);
                                        setHasAccantonamento(false);
                                        setMinAccantonamento(null);
                                        setHasHeating(false);
                                        setHasWaterPoints(false);
                                    }}
                                    className="mt-6 text-scout-blue font-bold hover:underline"
                                >
                                    Resetta ricerca
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <InteractiveMap locations={currentUser ? filteredLocations : filteredLocations.slice(0, 5)} />
            )}

            {/* Floating Action Button (FAB) for Transport Directory */}
            {currentUser && (
                <button
                    onClick={() => setShowTransportModal(true)}
                    className="fixed bottom-36 md:bottom-24 right-6 z-40 bg-scout-green hover:bg-scout-green-dark text-white p-4 rounded-full shadow-2xl hover:scale-[1.05] active:scale-95 transition-all duration-200 border-2 border-white dark:border-gray-800 flex items-center justify-center cursor-pointer group"
                    title="Anagrafica Trasporti Privati"
                >
                    <Bus size={24} className="group-hover:rotate-12 transition-transform duration-200" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 text-xs font-black uppercase transition-all duration-350 tracking-wider">
                        Trasporti
                    </span>
                </button>
            )}

            {/* Transport Directory Modal */}
            {showTransportModal && (
                <TransportModal onClose={() => setShowTransportModal(false)} />
            )}
        </div>
    );
}
