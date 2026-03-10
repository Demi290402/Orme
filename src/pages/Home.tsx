import { useEffect, useState } from 'react';
import { Search, Filter, Plus, X, Check, Clock } from 'lucide-react';
import { getLocations, getUser } from '@/lib/data';
import { Location, User as UserType } from '@/types';
import LocationCard from '@/components/LocationCard';
import { Link } from 'react-router-dom';
import { cn, getStalenessInfo } from '@/lib/utils';

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

export default function Home() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Advanced Filters State
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [hasTents, setHasTents] = useState(false);
    const [hasBeds, setHasBeds] = useState(false);
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
    const [selectedStaleness, setSelectedStaleness] = useState<number[]>([]);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);

    useEffect(() => {
        getLocations().then(setLocations).catch(console.error);
        getUser().then(setCurrentUser).catch(console.error);
    }, []);

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

        // 2. Tents & Beds
        const matchesTents = hasTents ? loc.hasTents : true;
        const matchesBeds = hasBeds ? (loc.beds || 0) > 0 : true;

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

        return matchesSearch && matchesTents && matchesBeds && matchesRegion && matchesBranch && matchesActivity && matchesStaleness;
    });

    const activeFiltersCount =
        selectedBranches.length +
        selectedRegions.length +
        selectedActivities.length +
        selectedStaleness.length +
        (hasTents ? 1 : 0) +
        (hasBeds ? 1 : 0);

    return (
        <div className="space-y-6 relative min-h-[calc(100vh-150px)] pb-20">
            {/* Header Section */}
            <div className="bg-scout-green text-white p-6 rounded-2xl shadow-lg -mx-4 md:mx-0 rounded-t-none md:rounded-2xl">
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
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-scout-green-light/50 shadow-sm placeholder:text-gray-400"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Link to="/add" className="bg-scout-blue text-white p-3 rounded-xl shadow-md active:scale-95 transition-transform hover:bg-scout-blue-dark flex items-center justify-center border-2 border-white/20 aspect-square">
                            <Plus size={24} />
                        </Link>
                        <button
                            onClick={() => setShowFilters(true)}
                            className={cn(
                                "p-3 rounded-xl shadow-md active:scale-95 transition-transform flex items-center justify-center border-2 border-white/20 relative aspect-square",
                                activeFiltersCount > 0 ? "bg-scout-brown text-white" : "bg-white text-scout-green"
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
                    <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                            <h2 className="text-2xl font-bold text-scout-green">Filtri</h2>
                            <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={24} /></button>
                        </div>

                        {/* 0. Stato Dati */}
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Clock size={16} className="text-scout-brown" /> Stato Aggiornamento Dati
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {STALENESS_LEVELS.map(s => (
                                    <button
                                        key={s.level}
                                        onClick={() => toggleSelection(selectedStaleness, s.level, setSelectedStaleness)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-bold border transition-all",
                                            selectedStaleness.includes(s.level)
                                                ? "bg-gray-900 text-white border-gray-900 shadow-md"
                                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
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
                            <h3 className="font-bold text-gray-900 mb-3 text-sm">Filtra per Branca</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(BRANCH_ACTIVITIES).map(branch => (
                                    <button
                                        key={branch}
                                        onClick={() => toggleSelection(selectedBranches, branch, setSelectedBranches)}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-xs font-bold border transition-all",
                                            selectedBranches.includes(branch)
                                                ? "bg-scout-green text-white border-scout-green shadow-sm"
                                                : "bg-white text-gray-600 border-gray-200"
                                        )}
                                    >
                                        {branch}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 1b. Attività specifiche */}
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3 text-sm">Attività Specifica</h3>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(Object.values(BRANCH_ACTIVITIES).flat())).sort().map(activity => (
                                    <button
                                        key={activity}
                                        onClick={() => toggleSelection(selectedActivities, activity, setSelectedActivities)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                                            selectedActivities.includes(activity)
                                                ? "bg-scout-blue text-white border-scout-blue"
                                                : "bg-white text-gray-500 border-gray-100 hover:border-scout-blue/30"
                                        )}
                                    >
                                        {activity}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Logistica */}
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">Logistica</h3>
                            <div className="flex gap-3">
                                <label className={cn(
                                    "flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-all",
                                    hasTents ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-gray-200 hover:bg-gray-50"
                                )}>
                                    <input type="checkbox" checked={hasTents} onChange={e => setHasTents(e.target.checked)} className="hidden" />
                                    <span className="font-semibold">🏕️ Tende</span>
                                </label>
                                <label className={cn(
                                    "flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-all",
                                    hasBeds ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-gray-200 hover:bg-gray-50"
                                )}>
                                    <input type="checkbox" checked={hasBeds} onChange={e => setHasBeds(e.target.checked)} className="hidden" />
                                    <span className="font-semibold">🛏️ Letti</span>
                                </label>
                            </div>
                        </div>

                        {/* 3. Regioni */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-gray-900">Regioni</h3>
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
                                            "flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm border transition-colors",
                                            selectedRegions.includes(region)
                                                ? "bg-scout-green/10 border-scout-green text-scout-green font-bold"
                                                : "bg-white border-transparent hover:bg-gray-50 text-gray-600"
                                        )}>
                                        <div className={cn(
                                            "w-4 h-4 rounded-full border flex items-center justify-center",
                                            selectedRegions.includes(region) ? "bg-scout-green border-scout-green" : "border-gray-300"
                                        )}>
                                            {selectedRegions.includes(region) && <Check size={10} className="text-white" />}
                                        </div>
                                        {region}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowFilters(false)}
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
                                    }}
                                    className="w-full mt-3 text-gray-500 font-medium py-2 hover:text-gray-900"
                                >
                                    Cancella tutto
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Results Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {(currentUser ? filteredLocations : filteredLocations.slice(0, 5)).map((location) => (
                    <LocationCard key={location.id} location={location} />
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
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="bg-gray-100 p-6 rounded-full mb-4">
                            <Search size={48} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Nessun luogo trovato</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">Prova a modificare i filtri o cerca qualcosa di diverso.</p>
                        {activeFiltersCount > 0 && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedBranches([]);
                                    setSelectedRegions([]);
                                    setSelectedActivities([]);
                                    setHasTents(false);
                                    setHasBeds(false);
                                }}
                                className="mt-6 text-scout-blue font-bold hover:underline"
                            >
                                Resetta ricerca
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
