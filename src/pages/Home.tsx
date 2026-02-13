import { useEffect, useState } from 'react';
import { Search, Filter, Plus, X, Check } from 'lucide-react';
import { getLocations } from '@/lib/data';
import { Location } from '@/types';
import LocationCard from '@/components/LocationCard';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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

export default function Home() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Advanced Filters State
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [hasTents, setHasTents] = useState(false);
    const [hasBeds, setHasBeds] = useState(false);

    useEffect(() => {
        setLocations(getLocations());
    }, []);

    const toggleSelection = (list: string[], item: string, setList: (l: string[]) => void) => {
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

        // 3. Regions (Multi-select)
        const matchesRegion = selectedRegions.length > 0 ? selectedRegions.includes(loc.region) : true;

        // 4. Branches (The complex one)
        let matchesBranch = true;
        if (selectedBranches.length > 0) {
            // Collect all valid activities based on selected branches
            const validActivities = selectedBranches.flatMap(branch => BRANCH_ACTIVITIES[branch]);

            // Check if the location has at least one of the valid activities
            matchesBranch = loc.activities.some(act => validActivities.includes(act));
        }

        return matchesSearch && matchesTents && matchesBeds && matchesRegion && matchesBranch;
    });

    const activeFiltersCount =
        selectedBranches.length +
        selectedRegions.length +
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

                        {/* 1. Branche */}
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">Branca / Attività</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(BRANCH_ACTIVITIES).map(branch => (
                                    <button
                                        key={branch}
                                        onClick={() => toggleSelection(selectedBranches, branch, setSelectedBranches)}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-sm font-bold border transition-all",
                                            selectedBranches.includes(branch)
                                                ? "bg-scout-blue text-white border-scout-blue shadow-md transform scale-105"
                                                : "bg-white text-gray-600 border-gray-200 hover:border-scout-blue/50"
                                        )}
                                    >
                                        {branch}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-2 italic">Seleziona più branche per vedere attività combinate o di gruppo.</p>
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
                {filteredLocations.map((location) => (
                    <LocationCard key={location.id} location={location} />
                ))}
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
