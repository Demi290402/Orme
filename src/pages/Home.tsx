import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { 
    Search, SlidersHorizontal, MapPin, Plus, X, Check, Clock, 
    Tent, BedDouble, Bus, Flame, Droplets, Home as HomeIcon, List, 
    Map as MapIcon, RotateCcw, Utensils, Trees, Accessibility, Layers, 
    Sparkles 
} from 'lucide-react';
import { getLocations, getUser, getUserLocationViews, getAllUsers } from '@/lib/data';
import { Location, User as UserType } from '@/types';
import LocationCard from '@/components/LocationCard';
import InteractiveMap from '@/components/InteractiveMap';
import TransportModal from '@/components/TransportModal';
import { Link } from 'react-router-dom';
import { cn, getStalenessInfo } from '@/lib/utils';
import { addPointsWithStats } from '@/lib/gamification';
import { ITALIAN_PROVINCIAL_DATA, ITALIAN_REGIONS, PROVINCE_TO_CODE, ALL_ITALIAN_PROVINCES } from '@/lib/constants';

const BRANCH_ACTIVITIES: Record<string, string[]> = {
    'L/C': ['Caccia giungla', 'Caccia primaverile', 'Caccia di Accettazione', 'Caccia invernale', 'Vacanze di Branco'],
    'E/G': ['Campo invernale', 'Campo primaverile', 'San Giorgio', 'Campo estivo'],
    'R/S': ['Route invernale', 'Route primaverile', 'Route estiva'],
    'Co.Ca.': ['Pernotto comunità capi'],
    'Gruppo': ['Uscita di apertura', 'Campo di gruppo']
};

const STALENESS_LEVELS = [
    { level: 0, color: 'bg-green-500', label: 'Dati recenti (< 1 anno)' },
    { level: 1, color: 'bg-yellow-500', label: 'Da verificare (1-2 anni)' },
    { level: 2, color: 'bg-orange-500', label: 'Non recenti (2-3 anni)' },
    { level: 3, color: 'bg-red-500', label: 'Datati (> 3 anni)' }
];

interface HomeProps {
    defaultView?: 'list' | 'map';
}

interface StoredLocationFilters {
    searchTerm?: string;
    viewMode?: 'list' | 'map';
    selectedBranches?: string[];
    selectedRegions?: string[];
    selectedProvinces?: string[];
    hasTents?: boolean;
    hasBeds?: boolean;
    minBeds?: number | null;
    hasAccantonamento?: boolean;
    minAccantonamento?: number | null;
    hasHeating?: boolean;
    hasWaterPoints?: boolean;
    hasEquippedKitchen?: boolean;
    hasGreenSpace?: boolean;
    hasDisabledAccess?: boolean;
    hasPoles?: boolean;
    selectedActivities?: string[];
    selectedStaleness?: number[];
}

const getInitialFilters = (): StoredLocationFilters => {
    try {
        const raw = sessionStorage.getItem('orme_location_filters');
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error("Errore lettura filtri da sessionStorage:", e);
    }
    return {};
};

export default function Home({ defaultView = 'list' }: HomeProps) {
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [initialFilters] = useState<StoredLocationFilters>(getInitialFilters);

    // Search and View
    const [searchInput, setSearchInput] = useState(() => initialFilters.searchTerm || '');
    const [searchTerm, setSearchTerm] = useState(() => initialFilters.searchTerm || '');
    const [viewMode, setViewMode] = useState<'list' | 'map'>(() => defaultView || initialFilters.viewMode || 'list');
    
    // Modal State
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [filterModalSection, setFilterModalSection] = useState<'zona' | 'esigenze' | 'servizi' | 'branche' | 'stato'>('esigenze');
    const [showTransportModal, setShowTransportModal] = useState(false);

    // Active Filters
    const [selectedBranches, setSelectedBranches] = useState<string[]>(() => initialFilters.selectedBranches || []);
    const [selectedRegions, setSelectedRegions] = useState<string[]>(() => initialFilters.selectedRegions || []);
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>(() => initialFilters.selectedProvinces || []);
    const [hasTents, setHasTents] = useState(() => initialFilters.hasTents || false);
    const [hasBeds, setHasBeds] = useState(() => initialFilters.hasBeds || false);
    const [minBeds, setMinBeds] = useState<number | null>(() => initialFilters.minBeds ?? null);
    const [hasAccantonamento, setHasAccantonamento] = useState(() => initialFilters.hasAccantonamento || false);
    const [minAccantonamento, setMinAccantonamento] = useState<number | null>(() => initialFilters.minAccantonamento ?? null);
    const [hasHeating, setHasHeating] = useState(() => initialFilters.hasHeating || false);
    const [hasWaterPoints, setHasWaterPoints] = useState(() => initialFilters.hasWaterPoints || false);
    const [hasEquippedKitchen, setHasEquippedKitchen] = useState(() => initialFilters.hasEquippedKitchen || false);
    const [hasGreenSpace, setHasGreenSpace] = useState(() => initialFilters.hasGreenSpace || false);
    const [hasDisabledAccess, setHasDisabledAccess] = useState(() => initialFilters.hasDisabledAccess || false);
    const [hasPoles, setHasPoles] = useState(() => initialFilters.hasPoles || false);
    const [selectedActivities, setSelectedActivities] = useState<string[]>(() => initialFilters.selectedActivities || []);
    const [selectedStaleness, setSelectedStaleness] = useState<number[]>(() => initialFilters.selectedStaleness || []);

    // Draft state for modal
    const [draftRegions, setDraftRegions] = useState<string[]>([]);
    const [draftProvinces, setDraftProvinces] = useState<string[]>([]);
    const [draftProvinceSearch, setDraftProvinceSearch] = useState('');
    const [draftHasTents, setDraftHasTents] = useState(false);
    const [draftHasBeds, setDraftHasBeds] = useState(false);
    const [draftMinBeds, setDraftMinBeds] = useState<number | null>(null);
    const [draftHasAccantonamento, setDraftHasAccantonamento] = useState(false);
    const [draftMinAccantonamento, setDraftMinAccantonamento] = useState<number | null>(null);
    const [draftHasHeating, setDraftHasHeating] = useState(false);
    const [draftHasWaterPoints, setDraftHasWaterPoints] = useState(false);
    const [draftHasEquippedKitchen, setDraftHasEquippedKitchen] = useState(false);
    const [draftHasGreenSpace, setDraftHasGreenSpace] = useState(false);
    const [draftHasDisabledAccess, setDraftHasDisabledAccess] = useState(false);
    const [draftHasPoles, setDraftHasPoles] = useState(false);
    const [draftBranches, setDraftBranches] = useState<string[]>([]);
    const [draftActivities, setDraftActivities] = useState<string[]>([]);
    const [draftStaleness, setDraftStaleness] = useState<number[]>([]);

    // User & Session
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [pendingCoCaUsers, setPendingCoCaUsers] = useState<UserType[]>([]);
    const [locationViews, setLocationViews] = useState<Record<string, string>>({});
    const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

    // Debounce ricerca testuale 250ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput.trim());
        }, 250);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Rilevamento stato offline
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Reset completo filtri
    const resetAllFilters = useCallback(() => {
        setSearchInput('');
        setSearchTerm('');
        setSelectedBranches([]);
        setSelectedRegions([]);
        setSelectedProvinces([]);
        setSelectedActivities([]);
        setSelectedStaleness([]);
        setHasTents(false);
        setHasBeds(false);
        setMinBeds(null);
        setHasAccantonamento(false);
        setMinAccantonamento(null);
        setHasHeating(false);
        setHasWaterPoints(false);
        setHasEquippedKitchen(false);
        setHasGreenSpace(false);
        setHasDisabledAccess(false);
        setHasPoles(false);
        sessionStorage.removeItem('orme_location_filters');
        sessionStorage.removeItem('orme_location_scroll_y');
    }, []);

    // Salva filtri in sessionStorage
    useEffect(() => {
        const hasAnyActiveFilter = 
            Boolean(searchTerm.trim()) ||
            selectedBranches.length > 0 ||
            selectedRegions.length > 0 ||
            selectedProvinces.length > 0 ||
            selectedActivities.length > 0 ||
            selectedStaleness.length > 0 ||
            hasTents ||
            hasBeds ||
            (minBeds !== null && minBeds > 0) ||
            hasAccantonamento ||
            (minAccantonamento !== null && minAccantonamento > 0) ||
            hasHeating ||
            hasWaterPoints ||
            hasEquippedKitchen ||
            hasGreenSpace ||
            hasDisabledAccess ||
            hasPoles ||
            viewMode !== defaultView;

        if (hasAnyActiveFilter) {
            const dataToSave: StoredLocationFilters = {
                searchTerm,
                viewMode,
                selectedBranches,
                selectedRegions,
                selectedProvinces,
                selectedActivities,
                selectedStaleness,
                hasTents,
                hasBeds,
                minBeds,
                hasAccantonamento,
                minAccantonamento,
                hasHeating,
                hasWaterPoints,
                hasEquippedKitchen,
                hasGreenSpace,
                hasDisabledAccess,
                hasPoles
            };
            sessionStorage.setItem('orme_location_filters', JSON.stringify(dataToSave));
        } else {
            sessionStorage.removeItem('orme_location_filters');
        }
    }, [
        searchTerm, viewMode, defaultView, selectedBranches, selectedRegions,
        selectedProvinces, selectedActivities, selectedStaleness, hasTents, hasBeds,
        minBeds, hasAccantonamento, minAccantonamento, hasHeating, hasWaterPoints,
        hasEquippedKitchen, hasGreenSpace, hasDisabledAccess, hasPoles
    ]);

    // Gestione posizione scroll
    useEffect(() => {
        const handleScroll = () => {
            sessionStorage.setItem('orme_location_scroll_y', String(window.scrollY));
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (locations.length > 0) {
            const savedScroll = sessionStorage.getItem('orme_location_scroll_y');
            if (savedScroll) {
                const y = parseInt(savedScroll, 10);
                if (!isNaN(y) && y > 0) {
                    setTimeout(() => {
                        window.scrollTo({ top: y, behavior: 'instant' });
                    }, 50);
                }
            }
        }
    }, [locations.length]);

    // Caricamento iniziale dati
    const loadData = useCallback(() => {
        setIsLoading(true);
        setLoadError(null);
        getLocations()
            .then(data => {
                setLocations(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Errore recupero luoghi:", err);
                setLoadError("Impossibile caricare i luoghi. Verifica la connessione.");
                setIsLoading(false);
            });

        getUser()
            .then(u => {
                setCurrentUser(u);
                if (u && u.membershipStatus === 'attivo' && (u.groupId || u.groupName)) {
                    getAllUsers().then(users => {
                        const pending = users.filter(usr => usr.membershipStatus === 'in_attesa');
                        setPendingCoCaUsers(pending);
                    }).catch(console.error);
                }
            })
            .catch(console.error);

        getUserLocationViews().then(setLocationViews).catch(console.error);

        const params = new URLSearchParams(window.location.search);
        if (params.get('transport') === 'true') {
            setShowTransportModal(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Inizializza bozza filtri quando si apre il modal
    const openFiltersModalWithSection = (section: 'zona' | 'esigenze' | 'servizi' | 'branche' | 'stato') => {
        setFilterModalSection(section);
        setDraftRegions([...selectedRegions]);
        setDraftProvinces([...selectedProvinces]);
        setDraftProvinceSearch('');
        setDraftHasTents(hasTents);
        setDraftHasBeds(hasBeds);
        setDraftMinBeds(minBeds);
        setDraftHasAccantonamento(hasAccantonamento);
        setDraftMinAccantonamento(minAccantonamento);
        setDraftHasHeating(hasHeating);
        setDraftHasWaterPoints(hasWaterPoints);
        setDraftHasEquippedKitchen(hasEquippedKitchen);
        setDraftHasGreenSpace(hasGreenSpace);
        setDraftHasDisabledAccess(hasDisabledAccess);
        setDraftHasPoles(hasPoles);
        setDraftBranches([...selectedBranches]);
        setDraftActivities([...selectedActivities]);
        setDraftStaleness([...selectedStaleness]);
        setShowFiltersModal(true);
    };

    // Applica bozza al modale
    const applyDraftFilters = () => {
        setSelectedRegions(draftRegions);
        setSelectedProvinces(draftProvinces);
        setHasTents(draftHasTents);
        setHasBeds(draftHasBeds);
        setMinBeds(draftMinBeds);
        setHasAccantonamento(draftHasAccantonamento);
        setMinAccantonamento(draftMinAccantonamento);
        setHasHeating(draftHasHeating);
        setHasWaterPoints(draftHasWaterPoints);
        setHasEquippedKitchen(draftHasEquippedKitchen);
        setHasGreenSpace(draftHasGreenSpace);
        setHasDisabledAccess(draftHasDisabledAccess);
        setHasPoles(draftHasPoles);
        setSelectedBranches(draftBranches);
        setSelectedActivities(draftActivities);
        setSelectedStaleness(draftStaleness);
        setShowFiltersModal(false);

        // Punti gamification se ricerca attiva per branca
        if (draftBranches.length > 0) {
            const stats: any = {};
            draftBranches.forEach(b => {
                const key = `search_track_${b}`;
                if (!sessionStorage.getItem(key)) {
                    sessionStorage.setItem(key, '1');
                    if (b === 'L/C') stats.searchesLC = 1;
                    if (b === 'E/G') stats.searchesEG = 1;
                    if (b === 'R/S') stats.searchesRS = 1;
                    if (b === 'Co.Ca.') stats.searchesCoCa = 1;
                    if (b === 'Gruppo') stats.searchesGruppo = 1;
                }
            });
            if (Object.keys(stats).length > 0) {
                addPointsWithStats(1, stats).catch(console.error);
            }
        }
    };

    // Calcolo novità non lette
    const getUnreadCount = useCallback((loc: Location) => {
        if (!currentUser || !loc.lastUpdatedAt) return 0;
        if (loc.lastUpdatedBy === currentUser.id || loc.lastUpdatedBy === currentUser.nickname) return 0;
        const lastViewedAt = locationViews[loc.id];
        const editTime = new Date(loc.lastUpdatedAt).getTime();
        const viewTime = lastViewedAt ? new Date(lastViewedAt).getTime() : 0;
        return editTime > viewTime ? 1 : 0;
    }, [currentUser, locationViews]);

    // Gestione Regioni/Province con cancellazione incompatibilità
    const toggleDraftRegion = (region: string) => {
        const next = draftRegions.includes(region)
            ? draftRegions.filter(r => r !== region)
            : [...draftRegions, region];
        setDraftRegions(next);

        // Se sono selezionate regioni specifiche, deseleziona le province che non vi appartengono
        if (next.length > 0) {
            const allowed = new Set([
                ...next.flatMap(r => (ITALIAN_PROVINCIAL_DATA[r] || []).map(p => p.toLowerCase())),
                ...locations.filter(l => next.includes(l.region)).map(l => (l.province || '').trim().toLowerCase())
            ]);
            setDraftProvinces(prev => prev.filter(p => allowed.has(p.toLowerCase())));
        }
    };

    // Province disponibili per la bozza
    const draftAvailableProvinces = useMemo(() => {
        let list: string[] = [];
        if (draftRegions.length > 0) {
            list = draftRegions.flatMap(r => ITALIAN_PROVINCIAL_DATA[r] || []);
        } else {
            list = ALL_ITALIAN_PROVINCES;
        }

        const fromLocs = locations
            .filter(l => draftRegions.length === 0 || draftRegions.includes(l.region))
            .map(l => (l.province || '').trim())
            .filter(p => p.length > 0);

        const unique = Array.from(new Set([...list, ...fromLocs]));
        return unique.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
    }, [draftRegions, locations]);

    const filteredDraftProvinces = useMemo(() => {
        if (!draftProvinceSearch.trim()) return draftAvailableProvinces;
        const q = draftProvinceSearch.trim().toLowerCase();
        return draftAvailableProvinces.filter(p => {
            const code = (PROVINCE_TO_CODE[p] || '').toLowerCase();
            return p.toLowerCase().includes(q) || code.includes(q);
        });
    }, [draftAvailableProvinces, draftProvinceSearch]);

    // Funzione generica di filtro
    const matchFilterCriteria = useCallback((loc: Location, criteria: {
        term: string;
        branches: string[];
        regions: string[];
        provinces: string[];
        tents: boolean;
        beds: boolean;
        minBedsVal: number | null;
        accantonamento: boolean;
        minAccantonamentoVal: number | null;
        heating: boolean;
        waterPoints: boolean;
        kitchen: boolean;
        greenSpace: boolean;
        disabledAccess: boolean;
        poles: boolean;
        activities: string[];
        staleness: number[];
    }) => {
        // 1. Ricerca testuale
        if (criteria.term) {
            const q = criteria.term.toLowerCase();
            const matchesSearch = 
                loc.name.toLowerCase().includes(q) ||
                loc.commune.toLowerCase().includes(q) ||
                loc.region.toLowerCase().includes(q) ||
                (loc.province && loc.province.toLowerCase().includes(q));
            if (!matchesSearch) return false;
        }

        // 2. Sistemazione
        if (criteria.tents && !loc.hasTents) return false;
        if (criteria.minBedsVal !== null && criteria.minBedsVal > 0) {
            if ((loc.beds || 0) < criteria.minBedsVal) return false;
        } else if (criteria.beds && (!loc.beds || loc.beds <= 0)) {
            return false;
        }

        if (criteria.minAccantonamentoVal !== null && criteria.minAccantonamentoVal > 0) {
            if ((loc.accantonamentoCapacity || 0) < criteria.minAccantonamentoVal) return false;
        } else if (criteria.accantonamento && (!loc.accantonamentoCapacity || loc.accantonamentoCapacity <= 0)) {
            return false;
        }

        // 3. Servizi
        if (criteria.heating && !loc.hasHeating) return false;
        if (criteria.waterPoints && !loc.hasWaterPoints) return false;
        if (criteria.kitchen && !loc.hasEquippedKitchen) return false;
        if (criteria.greenSpace && !loc.hasGreenSpace) return false;
        if (criteria.disabledAccess && !loc.hasDisabledAccess) return false;
        if (criteria.poles && !loc.hasPoles) return false;

        // 4. Regioni & Province
        if (criteria.regions.length > 0 && !criteria.regions.includes(loc.region)) return false;
        if (criteria.provinces.length > 0) {
            if (!loc.province) return false;
            const matchesProv = criteria.provinces.some(p => {
                const pNorm = p.trim().toLowerCase();
                const locNorm = loc.province.trim().toLowerCase();
                const pCode = (PROVINCE_TO_CODE[p] || '').toLowerCase();
                const locCode = (PROVINCE_TO_CODE[loc.province] || '').toLowerCase();
                return locNorm === pNorm || (pCode && locNorm === pCode) || (locCode && pNorm === locCode);
            });
            if (!matchesProv) return false;
        }

        // 5. Branche & Attività
        if (criteria.branches.length > 0) {
            const validActivitiesForBranches = criteria.branches.flatMap(branch => BRANCH_ACTIVITIES[branch] || []);
            const hasBranchActivity = loc.activities.some(act => validActivitiesForBranches.includes(act));
            if (!hasBranchActivity) return false;
        }

        if (criteria.activities.length > 0) {
            const hasActivity = loc.activities.some(act => criteria.activities.includes(act));
            if (!hasActivity) return false;
        }

        // 6. Staleness
        if (criteria.staleness.length > 0) {
            const info = getStalenessInfo(loc.lastUpdatedAt);
            if (!criteria.staleness.includes(info.level)) return false;
        }

        return true;
    }, []);

    // Risultati effettivi filtrati
    const filteredLocations = useMemo(() => {
        return locations.filter(loc => matchFilterCriteria(loc, {
            term: searchTerm,
            branches: selectedBranches,
            regions: selectedRegions,
            provinces: selectedProvinces,
            tents: hasTents,
            beds: hasBeds,
            minBedsVal: minBeds,
            accantonamento: hasAccantonamento,
            minAccantonamentoVal: minAccantonamento,
            heating: hasHeating,
            waterPoints: hasWaterPoints,
            kitchen: hasEquippedKitchen,
            greenSpace: hasGreenSpace,
            disabledAccess: hasDisabledAccess,
            poles: hasPoles,
            activities: selectedActivities,
            staleness: selectedStaleness
        }));
    }, [
        locations, matchFilterCriteria, searchTerm, selectedBranches, selectedRegions,
        selectedProvinces, hasTents, hasBeds, minBeds, hasAccantonamento,
        minAccantonamento, hasHeating, hasWaterPoints, hasEquippedKitchen,
        hasGreenSpace, hasDisabledAccess, hasPoles, selectedActivities, selectedStaleness
    ]);

    // Conteggio bozza in tempo reale nel modale
    const draftMatchCount = useMemo(() => {
        return locations.filter(loc => matchFilterCriteria(loc, {
            term: searchTerm,
            branches: draftBranches,
            regions: draftRegions,
            provinces: draftProvinces,
            tents: draftHasTents,
            beds: draftHasBeds,
            minBedsVal: draftMinBeds,
            accantonamento: draftHasAccantonamento,
            minAccantonamentoVal: draftMinAccantonamento,
            heating: draftHasHeating,
            waterPoints: draftHasWaterPoints,
            kitchen: draftHasEquippedKitchen,
            greenSpace: draftHasGreenSpace,
            disabledAccess: draftHasDisabledAccess,
            poles: draftHasPoles,
            activities: draftActivities,
            staleness: draftStaleness
        })).length;
    }, [
        locations, matchFilterCriteria, searchTerm, draftBranches, draftRegions,
        draftProvinces, draftHasTents, draftHasBeds, draftMinBeds, draftHasAccantonamento,
        draftMinAccantonamento, draftHasHeating, draftHasWaterPoints, draftHasEquippedKitchen,
        draftHasGreenSpace, draftHasDisabledAccess, draftHasPoles, draftActivities, draftStaleness
    ]);

    // Coordinate per la mappa
    const locationsWithCoordsCount = useMemo(() => {
        return filteredLocations.filter(loc => Boolean(loc.coordinates?.lat && loc.coordinates?.lng) || Boolean(loc.googleMapsLink)).length;
    }, [filteredLocations]);

    const locationsWithoutCoordsCount = filteredLocations.length - locationsWithCoordsCount;

    // Conteggio filtri attivi (esclusa ricerca testuale)
    const activeFiltersCount = useMemo(() => {
        return (
            selectedBranches.length +
            selectedRegions.length +
            selectedProvinces.length +
            selectedActivities.length +
            selectedStaleness.length +
            (hasTents ? 1 : 0) +
            ((minBeds !== null && minBeds > 0) || hasBeds ? 1 : 0) +
            ((minAccantonamento !== null && minAccantonamento > 0) || hasAccantonamento ? 1 : 0) +
            (hasHeating ? 1 : 0) +
            (hasWaterPoints ? 1 : 0) +
            (hasEquippedKitchen ? 1 : 0) +
            (hasGreenSpace ? 1 : 0) +
            (hasDisabledAccess ? 1 : 0) +
            (hasPoles ? 1 : 0)
        );
    }, [
        selectedBranches.length, selectedRegions.length, selectedProvinces.length,
        selectedActivities.length, selectedStaleness.length, hasTents, minBeds, hasBeds,
        minAccantonamento, hasAccantonamento, hasHeating, hasWaterPoints,
        hasEquippedKitchen, hasGreenSpace, hasDisabledAccess, hasPoles
    ]);

    // Etichetta pulsante "Zona"
    const zoneButtonLabel = useMemo(() => {
        if (selectedProvinces.length === 1) {
            const p = selectedProvinces[0];
            const code = PROVINCE_TO_CODE[p];
            return `Zona · ${p}${code ? ` (${code})` : ''}`;
        }
        if (selectedProvinces.length > 1) {
            return `Zona · ${selectedProvinces.length} province`;
        }
        if (selectedRegions.length === 1) {
            return `Zona · ${selectedRegions[0]}`;
        }
        if (selectedRegions.length > 1) {
            return `Zona · ${selectedRegions.length} regioni`;
        }
        return 'Zona · Tutta Italia';
    }, [selectedProvinces, selectedRegions]);

    // Focus / Keyboard trap per il modale dei filtri
    const modalRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showFiltersModal) {
                setShowFiltersModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showFiltersModal]);

    // Posiziona lo scroll sulla sezione richiesta quando si apre il modale
    useEffect(() => {
        if (showFiltersModal && filterModalSection) {
            const timer = setTimeout(() => {
                const el = document.getElementById(`heading-${filterModalSection}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [showFiltersModal, filterModalSection]);

    // Gestione click supporto Akela
    const handleOpenAkela = () => {
        window.dispatchEvent(new CustomEvent('open-akela'));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 relative min-h-[calc(100vh-140px)] pb-24 text-gray-900 dark:text-[#F1F6F2]">
            {/* 1. Header Locale Compatto & Azioni Principali */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200/80 dark:border-gray-800">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Luoghi per uscite e campi
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                        Basi scout, case vacanze, accantonamenti e terreni per tende in tutta Italia.
                    </p>
                </div>

                {/* Gruppo Azioni in testata */}
                <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowTransportModal(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-[#182932] text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-2xs min-h-[44px] cursor-pointer"
                        title="Apri la rubrica ditte pullman e preventivi"
                    >
                        <Bus size={17} className="text-scout-blue shrink-0" aria-hidden="true" />
                        <span>Pullman & Trasporti</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenAkela}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-[#182932] text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-2xs min-h-[44px] cursor-pointer"
                        title="Chiedi supporto metodologico ad Akela AI"
                    >
                        <span className="text-base leading-none" aria-hidden="true">🐺</span>
                        <span>Akela AI</span>
                        <Sparkles size={14} className="text-amber-500 shrink-0" aria-hidden="true" />
                    </button>

                    <Link
                        to="/add"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#1B4931] hover:bg-[#133724] text-white transition-all shadow-sm active:scale-95 min-h-[44px]"
                    >
                        <Plus size={18} className="shrink-0" aria-hidden="true" />
                        <span>Aggiungi luogo</span>
                    </Link>
                </div>
            </header>

            {/* Banner Offline se connettività assente */}
            {isOffline && (
                <div 
                    role="status" 
                    className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2"
                >
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" aria-hidden="true" />
                    <span>Offline · Stai consultando i luoghi salvati in locale su questo dispositivo.</span>
                </div>
            )}

            {/* Banner Richieste Accesso CoCa in Sospeso (se presenti) */}
            {pendingCoCaUsers.length > 0 && (
                <Link
                    to="/verbali/membri?tab=sicurezza"
                    className="block bg-amber-500/10 border-2 border-amber-500/40 hover:border-amber-500 rounded-2xl p-4 transition-all shadow-xs group"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                                <Clock size={20} aria-hidden="true" />
                            </div>
                            <div>
                                <h2 className="font-bold text-sm sm:text-base text-amber-950 dark:text-amber-200">
                                    {pendingCoCaUsers.length === 1 ? '1 richiesta di accesso alla Comunità Capi' : `${pendingCoCaUsers.length} richieste di accesso alla Comunità Capi`}
                                </h2>
                                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                                    {pendingCoCaUsers.map(u => `${u.firstName} ${u.lastName}`).join(', ')} in attesa di approvazione (2 voti).
                                </p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 group-hover:translate-x-1 transition-transform self-end sm:self-auto shrink-0 bg-amber-500/20 px-3 py-1.5 rounded-lg">
                            Esamina e Vota →
                        </span>
                    </div>
                </Link>
            )}

            {/* 2. Barra di Ricerca a larghezza intera (Altezza 48px) */}
            <div className="relative">
                <label htmlFor="location-search-input" className="sr-only">
                    Cerca luoghi per nome, comune o provincia
                </label>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                    <Search size={20} className="text-scout-green dark:text-emerald-400" aria-hidden="true" />
                </div>
                <input
                    id="location-search-input"
                    type="search"
                    placeholder="Nome, comune o provincia..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full h-12 pl-11 pr-10 rounded-xl bg-white dark:bg-[#182932] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-semibold focus:outline-none focus:ring-2 focus:ring-scout-green dark:focus:ring-emerald-400 shadow-2xs text-sm sm:text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors"
                />
                {searchInput && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchInput('');
                            setSearchTerm('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full cursor-pointer"
                        title="Cancella testo"
                        aria-label="Cancella testo di ricerca"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* 3. Controlli Criteri Principali: "Zona" e "Filtri" */}
            <div className="flex items-center gap-2.5 flex-wrap">
                <button
                    type="button"
                    onClick={() => openFiltersModalWithSection('zona')}
                    className={cn(
                        "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all shadow-2xs min-h-[44px] cursor-pointer",
                        (selectedRegions.length > 0 || selectedProvinces.length > 0)
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-scout-green-dark dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                            : "bg-white dark:bg-[#182932] text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                    )}
                    aria-label={`Filtro geografico attuale: ${zoneButtonLabel}. Clicca per modificare`}
                >
                    <MapPin size={16} className="text-scout-green dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    <span className="font-bold">{zoneButtonLabel}</span>
                </button>

                <button
                    type="button"
                    onClick={() => openFiltersModalWithSection('esigenze')}
                    className={cn(
                        "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all shadow-2xs min-h-[44px] cursor-pointer",
                        activeFiltersCount > 0
                            ? "bg-[#1B4931] text-white border-[#1B4931] shadow-xs"
                            : "bg-white dark:bg-[#182932] text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                    )}
                    aria-label={`Pannello filtri, ${activeFiltersCount} filtri attivi`}
                >
                    <SlidersHorizontal size={16} className="shrink-0" aria-hidden="true" />
                    <span>Filtri</span>
                    {activeFiltersCount > 0 && (
                        <span className="bg-white text-[#1B4931] text-[11px] font-black px-1.5 py-0.2 rounded-full">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>
            </div>

            {/* 4. Chip dei Filtri Applicati (vanno a capo, eliminabili con un click) */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1" aria-label="Filtri attualmente attivi">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                        Filtri applicati:
                    </span>

                    {/* Regioni */}
                    {selectedRegions.map(r => (
                        <span key={r} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-scout-green-dark dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <MapPin size={12} aria-hidden="true" />
                            <span>{r}</span>
                            <button
                                type="button"
                                onClick={() => setSelectedRegions(selectedRegions.filter(x => x !== r))}
                                className="hover:bg-emerald-200/50 dark:hover:bg-emerald-800/60 rounded-full p-0.5 cursor-pointer ml-0.5"
                                aria-label={`Rimuovi filtro regione ${r}`}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}

                    {/* Province */}
                    {selectedProvinces.map(p => (
                        <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-scout-green-dark dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <MapPin size={12} aria-hidden="true" />
                            <span>{p}{PROVINCE_TO_CODE[p] ? ` (${PROVINCE_TO_CODE[p]})` : ''}</span>
                            <button
                                type="button"
                                onClick={() => setSelectedProvinces(selectedProvinces.filter(x => x !== p))}
                                className="hover:bg-emerald-200/50 dark:hover:bg-emerald-800/60 rounded-full p-0.5 cursor-pointer ml-0.5"
                                aria-label={`Rimuovi filtro provincia ${p}`}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}

                    {/* Tende */}
                    {hasTents && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <Tent size={12} aria-hidden="true" />
                            <span>Spazio tende</span>
                            <button
                                type="button"
                                onClick={() => setHasTents(false)}
                                className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5"
                                aria-label="Rimuovi filtro tende"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    {/* Letti */}
                    {minBeds !== null && minBeds > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <BedDouble size={12} aria-hidden="true" />
                            <span>≥ {minBeds} posti letto</span>
                            <button
                                type="button"
                                onClick={() => { setMinBeds(null); setHasBeds(false); }}
                                className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5"
                                aria-label="Rimuovi filtro posti letto minimi"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ) : (hasBeds && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <BedDouble size={12} aria-hidden="true" />
                            <span>Con posti letto</span>
                            <button
                                type="button"
                                onClick={() => setHasBeds(false)}
                                className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5"
                                aria-label="Rimuovi filtro posti letto"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}

                    {/* Accantonamento */}
                    {minAccantonamento !== null && minAccantonamento > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <HomeIcon size={12} aria-hidden="true" />
                            <span>≥ {minAccantonamento} a terra</span>
                            <button
                                type="button"
                                onClick={() => { setMinAccantonamento(null); setHasAccantonamento(false); }}
                                className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5"
                                aria-label="Rimuovi filtro posti accantonamento"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ) : (hasAccantonamento && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <HomeIcon size={12} aria-hidden="true" />
                            <span>Accantonamento</span>
                            <button
                                type="button"
                                onClick={() => setHasAccantonamento(false)}
                                className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5"
                                aria-label="Rimuovi filtro accantonamento"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}

                    {/* Servizi */}
                    {hasEquippedKitchen && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <Utensils size={12} aria-hidden="true" />
                            <span>Cucina attrezzata</span>
                            <button type="button" onClick={() => setHasEquippedKitchen(false)} className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5" aria-label="Rimuovi filtro cucina"><X size={12} /></button>
                        </span>
                    )}
                    {hasGreenSpace && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <Trees size={12} aria-hidden="true" />
                            <span>Spazio verde</span>
                            <button type="button" onClick={() => setHasGreenSpace(false)} className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5" aria-label="Rimuovi filtro spazio verde"><X size={12} /></button>
                        </span>
                    )}
                    {hasWaterPoints && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <Droplets size={12} aria-hidden="true" />
                            <span>Punti d'acqua</span>
                            <button type="button" onClick={() => setHasWaterPoints(false)} className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5" aria-label="Rimuovi filtro punti acqua"><X size={12} /></button>
                        </span>
                    )}
                    {hasHeating && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <Flame size={12} aria-hidden="true" />
                            <span>Riscaldato</span>
                            <button type="button" onClick={() => setHasHeating(false)} className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5" aria-label="Rimuovi filtro riscaldamento"><X size={12} /></button>
                        </span>
                    )}
                    {hasDisabledAccess && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <Accessibility size={12} aria-hidden="true" />
                            <span>Disabili</span>
                            <button type="button" onClick={() => setHasDisabledAccess(false)} className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5" aria-label="Rimuovi filtro disabili"><X size={12} /></button>
                        </span>
                    )}
                    {hasPoles && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <Layers size={12} aria-hidden="true" />
                            <span>Pali</span>
                            <button type="button" onClick={() => setHasPoles(false)} className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5" aria-label="Rimuovi filtro pali"><X size={12} /></button>
                        </span>
                    )}

                    {/* Branche */}
                    {selectedBranches.map(b => (
                        <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <span>{b}</span>
                            <button type="button" onClick={() => setSelectedBranches(selectedBranches.filter(x => x !== b))} className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5" aria-label={`Rimuovi filtro branca ${b}`}><X size={12} /></button>
                        </span>
                    ))}

                    {/* Attività */}
                    {selectedActivities.map(a => (
                        <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                            <span>{a}</span>
                            <button type="button" onClick={() => setSelectedActivities(selectedActivities.filter(x => x !== a))} className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5" aria-label={`Rimuovi filtro attività ${a}`}><X size={12} /></button>
                        </span>
                    ))}

                    {/* Stato Dati */}
                    {selectedStaleness.map(lvl => {
                        const sObj = STALENESS_LEVELS.find(s => s.level === lvl);
                        return (
                            <span key={lvl} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                                <span className={cn("w-2 h-2 rounded-full", sObj?.color)} aria-hidden="true" />
                                <span>{sObj?.label}</span>
                                <button type="button" onClick={() => setSelectedStaleness(selectedStaleness.filter(x => x !== lvl))} className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer ml-0.5" aria-label="Rimuovi filtro stato dati"><X size={12} /></button>
                            </span>
                        );
                    })}

                    <button
                        type="button"
                        onClick={resetAllFilters}
                        className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-bold hover:underline px-2 py-1 cursor-pointer"
                    >
                        <RotateCcw size={12} aria-hidden="true" />
                        <span>Azzera filtri</span>
                    </button>
                </div>
            )}

            {/* 5. Barra Risultati & Controllo Segmentato Vista (Elenco / Mappa) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-scout-green dark:bg-emerald-400 shrink-0" aria-hidden="true" />
                    <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white" aria-live="polite">
                        {viewMode === 'list' ? (
                            isLoading 
                                ? 'Caricamento luoghi in corso...' 
                                : `${filteredLocations.length} ${filteredLocations.length === 1 ? 'luogo trovato' : 'luoghi trovati'}`
                        ) : (
                            `${filteredLocations.length} ${filteredLocations.length === 1 ? 'luogo' : 'luoghi'} · ${locationsWithCoordsCount} sulla mappa${locationsWithoutCoordsCount > 0 ? ` (${locationsWithoutCoordsCount} senza coordinate GPS)` : ''}`
                        )}
                    </span>
                </div>

                {/* Controllo Segmentato Elenco / Mappa */}
                <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0 self-start sm:self-auto" role="group" aria-label="Modalità di visualizzazione">
                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer",
                            viewMode === 'list'
                                ? "bg-white dark:bg-[#182932] text-scout-green-dark dark:text-emerald-300 shadow-2xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                        aria-pressed={viewMode === 'list'}
                    >
                        <List size={15} aria-hidden="true" />
                        <span>Elenco</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('map')}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer",
                            viewMode === 'map'
                                ? "bg-white dark:bg-[#182932] text-scout-green-dark dark:text-emerald-300 shadow-2xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                        aria-pressed={viewMode === 'map'}
                    >
                        <MapIcon size={15} aria-hidden="true" />
                        <span>Mappa</span>
                    </button>
                </div>
            </div>

            {/* 6. Layout Principale Risultati */}
            {isLoading ? (
                /* Skeleton Loader */
                <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                    {[1, 2, 3, 4].map(n => (
                        <div key={n} className="bg-white dark:bg-[#182932] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/80 animate-pulse space-y-4">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4" />
                            <div className="h-4 bg-gray-150 dark:bg-gray-750 rounded-md w-1/2" />
                            <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-md w-full" />
                            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-1/3" />
                        </div>
                    ))}
                </div>
            ) : loadError ? (
                /* Errore di caricamento */
                <div className="p-8 text-center bg-white dark:bg-[#182932] rounded-2xl border border-red-200 dark:border-red-800 space-y-3">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">{loadError}</p>
                    <button
                        type="button"
                        onClick={loadData}
                        className="px-4 py-2 bg-[#1B4931] text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                        Riprova
                    </button>
                </div>
            ) : viewMode === 'list' ? (
                /* Vista Elenco */
                <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                    {(currentUser ? filteredLocations : filteredLocations.slice(0, 5)).map((location) => (
                        <LocationCard 
                            key={location.id} 
                            location={location} 
                            unreadModificationsCount={getUnreadCount(location)} 
                        />
                    ))}

                    {/* Messaggio Invito per Utenti Ospiti */}
                    {!currentUser && filteredLocations.length > 5 && (
                        <div className="col-span-full mt-4 p-6 sm:p-8 bg-white dark:bg-[#182932] rounded-2xl border-2 border-dashed border-scout-blue/40 text-center space-y-3 shadow-xs">
                            <div className="bg-scout-blue/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-scout-blue">
                                <Plus size={24} aria-hidden="true" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                Vuoi vedere tutti i luoghi censiti?
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-xs sm:text-sm">
                                Accedi o registrati gratuitamente per consultare l'intero catalogo di {locations.length} strutture scout!
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                                <Link to="/register" className="bg-scout-blue text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:bg-blue-700 transition-all">
                                    Registrati ora
                                </Link>
                                <Link to="/login" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                                    Accedi
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Stato Nessun Risultato Trovato */}
                    {filteredLocations.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-[#182932] rounded-2xl border border-gray-200 dark:border-gray-700/80 p-6 space-y-4">
                            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-750 flex items-center justify-center text-gray-400">
                                <Search size={28} aria-hidden="true" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                    Nessun luogo corrisponde a tutti i criteri
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm max-w-md mx-auto">
                                    Prova a modificare i filtri o a rimuovere una condizione per ampliare la ricerca.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => openFiltersModalWithSection('esigenze')}
                                    className="px-4 py-2.5 bg-[#1B4931] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#133724] transition-all cursor-pointer"
                                >
                                    Modifica filtri
                                </button>
                                {activeFiltersCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={resetAllFilters}
                                        className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-650 transition-all cursor-pointer"
                                    >
                                        Azzera tutti i filtri
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Vista Mappa */
                <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700/80 shadow-xs">
                    <InteractiveMap locations={currentUser ? filteredLocations : filteredLocations.slice(0, 5)} />
                </div>
            )}

            {/* 7. Dialogo Modale Filtri Completo & Accessibile */}
            {showFiltersModal && (
                <div 
                    className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => setShowFiltersModal(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="filters-dialog-title"
                >
                    <div 
                        ref={modalRef}
                        className="bg-white dark:bg-[#182932] rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header Modale */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150 dark:border-gray-700 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <SlidersHorizontal size={20} className="text-scout-green dark:text-emerald-400" aria-hidden="true" />
                                <h2 id="filters-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white">
                                    Filtra luoghi
                                </h2>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowFiltersModal(false)} 
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 cursor-pointer"
                                aria-label="Chiudi pannello filtri"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Contenuto Scrollabile Filtri */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Sezione 1: Zona Geografica */}
                            <section className="space-y-3" aria-labelledby="heading-zona">
                                <div className="flex justify-between items-center">
                                    <h3 id="heading-zona" className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                        <MapPin size={16} className="text-scout-green dark:text-emerald-400" aria-hidden="true" />
                                        Zona geografica
                                    </h3>
                                    {(draftRegions.length > 0 || draftProvinces.length > 0) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDraftRegions([]);
                                                setDraftProvinces([]);
                                            }}
                                            className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer"
                                        >
                                            Azzera zona
                                        </button>
                                    )}
                                </div>

                                {/* Regioni */}
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-2">
                                        Regione:
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 border border-gray-150 dark:border-gray-700/60 rounded-xl bg-gray-50/50 dark:bg-gray-800/40">
                                        {ITALIAN_REGIONS.map(reg => {
                                            const isChecked = draftRegions.includes(reg);
                                            return (
                                                <button
                                                    key={reg}
                                                    type="button"
                                                    onClick={() => toggleDraftRegion(reg)}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer border select-none",
                                                        isChecked
                                                            ? "bg-[#1B4931]/10 dark:bg-emerald-950/40 text-scout-green-dark dark:text-emerald-300 border-scout-green font-bold"
                                                            : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                                                    )}
                                                    aria-pressed={isChecked}
                                                >
                                                    <span className={cn(
                                                        "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                                                        isChecked ? "bg-scout-green border-scout-green text-white" : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800"
                                                    )}>
                                                        {isChecked && <Check size={10} />}
                                                    </span>
                                                    <span className="truncate">{reg}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Province */}
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">
                                        Provincia:
                                    </span>
                                    <div className="relative mb-2">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder={draftRegions.length > 0 ? "Filtra province della regione..." : "Cerca provincia (es. Roma, Bari, Trento)..."}
                                            value={draftProvinceSearch}
                                            onChange={(e) => setDraftProvinceSearch(e.target.value)}
                                            className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-scout-green"
                                        />
                                        {draftProvinceSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setDraftProvinceSearch('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 border border-gray-150 dark:border-gray-700/60 rounded-xl bg-gray-50/50 dark:bg-gray-800/40">
                                        {filteredDraftProvinces.map(prov => {
                                            const code = PROVINCE_TO_CODE[prov];
                                            const isChecked = draftProvinces.includes(prov);
                                            return (
                                                <button
                                                    key={prov}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isChecked) {
                                                            setDraftProvinces(draftProvinces.filter(p => p !== prov));
                                                        } else {
                                                            setDraftProvinces([...draftProvinces, prov]);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer border select-none",
                                                        isChecked
                                                            ? "bg-[#1B4931]/10 dark:bg-emerald-950/40 text-scout-green-dark dark:text-emerald-300 border-scout-green font-bold"
                                                            : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                                                    )}
                                                    aria-pressed={isChecked}
                                                >
                                                    <span className={cn(
                                                        "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                                                        isChecked ? "bg-scout-green border-scout-green text-white" : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800"
                                                    )}>
                                                        {isChecked && <Check size={10} />}
                                                    </span>
                                                    <span className="truncate">{prov} {code && `(${code})`}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>

                            {/* Sezione 2: Partecipanti & Sistemazione */}
                            <section className="space-y-3 pt-4 border-t border-gray-150 dark:border-gray-700/80" aria-labelledby="heading-sistemazione">
                                <h3 id="heading-sistemazione" className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                    <BedDouble size={16} className="text-scout-blue" aria-hidden="true" />
                                    Partecipanti e sistemazione
                                </h3>

                                <div className="space-y-3 text-xs">
                                    {/* Spazio Tende */}
                                    <label className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors",
                                        draftHasTents 
                                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-scout-green text-scout-green-dark dark:text-emerald-300 font-bold" 
                                            : "bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-650 text-gray-700 dark:text-gray-300"
                                    )}>
                                        <div className="flex items-center gap-2.5">
                                            <input 
                                                type="checkbox" 
                                                checked={draftHasTents} 
                                                onChange={e => setDraftHasTents(e.target.checked)} 
                                                className="w-4 h-4 rounded text-scout-green focus:ring-scout-green" 
                                            />
                                            <div>
                                                <span className="block font-bold">🏕️ Spazio per montare tende</span>
                                                <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">Spazio tende indicato; capienza da confermare</span>
                                            </div>
                                        </div>
                                    </label>

                                    {/* Posti Letto */}
                                    <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-650 bg-white dark:bg-gray-750 space-y-2.5">
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <div className="flex items-center gap-2.5">
                                                <input 
                                                    type="checkbox" 
                                                    checked={draftHasBeds || (draftMinBeds !== null && draftMinBeds > 0)} 
                                                    onChange={e => {
                                                        setDraftHasBeds(e.target.checked);
                                                        if (!e.target.checked) setDraftMinBeds(null);
                                                    }} 
                                                    className="w-4 h-4 rounded text-scout-blue focus:ring-scout-blue" 
                                                />
                                                <div>
                                                    <span className="block font-bold">🛏️ Posti letto al coperto</span>
                                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Posti letto dichiarati sufficienti</span>
                                                </div>
                                            </div>
                                        </label>

                                        {/* Stepper posti letto minimi */}
                                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700/60">
                                            <span className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">Numero minimo posti letto:</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = draftMinBeds || 0;
                                                        const next = Math.max(0, current - 5);
                                                        setDraftMinBeds(next === 0 ? null : next);
                                                        if (next === 0) setDraftHasBeds(false);
                                                    }}
                                                    disabled={!draftMinBeds || draftMinBeds <= 0}
                                                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold disabled:opacity-30 cursor-pointer"
                                                >
                                                    -
                                                </button>
                                                <span className="w-10 text-center font-bold font-mono">
                                                    {draftMinBeds || 0}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = draftMinBeds || 0;
                                                        setDraftMinBeds(current + 5);
                                                        setDraftHasBeds(true);
                                                    }}
                                                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold cursor-pointer"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Accantonamento */}
                                    <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-650 bg-white dark:bg-gray-750 space-y-2.5">
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <div className="flex items-center gap-2.5">
                                                <input 
                                                    type="checkbox" 
                                                    checked={draftHasAccantonamento || (draftMinAccantonamento !== null && draftMinAccantonamento > 0)} 
                                                    onChange={e => {
                                                        setDraftHasAccantonamento(e.target.checked);
                                                        if (!e.target.checked) setDraftMinAccantonamento(null);
                                                    }} 
                                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-600" 
                                                />
                                                <div>
                                                    <span className="block font-bold">🏠 Accantonamento a terra (stuoino)</span>
                                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Posti accantonamento dichiarati</span>
                                                </div>
                                            </div>
                                        </label>

                                        {/* Stepper posti accantonamento minimi */}
                                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700/60">
                                            <span className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">Numero minimo a terra:</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = draftMinAccantonamento || 0;
                                                        const next = Math.max(0, current - 5);
                                                        setDraftMinAccantonamento(next === 0 ? null : next);
                                                        if (next === 0) setDraftHasAccantonamento(false);
                                                    }}
                                                    disabled={!draftMinAccantonamento || draftMinAccantonamento <= 0}
                                                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold disabled:opacity-30 cursor-pointer"
                                                >
                                                    -
                                                </button>
                                                <span className="w-10 text-center font-bold font-mono">
                                                    {draftMinAccantonamento || 0}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = draftMinAccantonamento || 0;
                                                        setDraftMinAccantonamento(current + 5);
                                                        setDraftHasAccantonamento(true);
                                                    }}
                                                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold cursor-pointer"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Sezione 3: Servizi Necessari */}
                            <section className="space-y-3 pt-4 border-t border-gray-150 dark:border-gray-700/80" aria-labelledby="heading-servizi">
                                <h3 id="heading-servizi" className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                    <Utensils size={16} className="text-scout-green dark:text-emerald-400" aria-hidden="true" />
                                    Servizi necessari
                                </h3>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {[
                                        { label: 'Cucina attrezzata', val: draftHasEquippedKitchen, set: setDraftHasEquippedKitchen, icon: Utensils },
                                        { label: 'Spazio verde', val: draftHasGreenSpace, set: setDraftHasGreenSpace, icon: Trees },
                                        { label: 'Punti d\'acqua', val: draftHasWaterPoints, set: setDraftHasWaterPoints, icon: Droplets },
                                        { label: 'Riscaldamento', val: draftHasHeating, set: setDraftHasHeating, icon: Flame },
                                        { label: 'Accessibile disabili', val: draftHasDisabledAccess, set: setDraftHasDisabledAccess, icon: Accessibility },
                                        { label: 'Pali da costruzione', val: draftHasPoles, set: setDraftHasPoles, icon: Layers },
                                    ].map(item => (
                                        <button
                                            key={item.label}
                                            type="button"
                                            onClick={() => item.set(!item.val)}
                                            className={cn(
                                                "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-colors cursor-pointer",
                                                item.val 
                                                    ? "bg-[#1B4931]/10 dark:bg-emerald-950/40 border-scout-green text-scout-green-dark dark:text-emerald-300 font-bold" 
                                                    : "bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-650 text-gray-700 dark:text-gray-300"
                                            )}
                                            aria-pressed={item.val}
                                        >
                                            <item.icon size={15} className="shrink-0" />
                                            <span className="truncate">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Sezione 4: Branche e Attività */}
                            <section className="space-y-3 pt-4 border-t border-gray-150 dark:border-gray-700/80" aria-labelledby="heading-branche">
                                <h3 id="heading-branche" className="font-bold text-sm text-gray-900 dark:text-white">
                                    Branche e attività
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.keys(BRANCH_ACTIVITIES).map(b => {
                                        const isChecked = draftBranches.includes(b);
                                        return (
                                            <button
                                                key={b}
                                                type="button"
                                                onClick={() => {
                                                    if (isChecked) {
                                                        setDraftBranches(draftBranches.filter(x => x !== b));
                                                    } else {
                                                        setDraftBranches([...draftBranches, b]);
                                                    }
                                                }}
                                                className={cn(
                                                    "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer",
                                                    isChecked 
                                                        ? "bg-[#1B4931] text-white border-[#1B4931]" 
                                                        : "bg-white dark:bg-gray-750 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-650 hover:bg-gray-50"
                                                )}
                                                aria-pressed={isChecked}
                                            >
                                                {b}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Sezione 5: Stato Aggiornamento Dati */}
                            <section className="space-y-3 pt-4 border-t border-gray-150 dark:border-gray-700/80" aria-labelledby="heading-stato">
                                <h3 id="heading-stato" className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock size={16} className="text-gray-500" aria-hidden="true" />
                                    Stato aggiornamento informazioni
                                </h3>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {STALENESS_LEVELS.map(s => {
                                        const isChecked = draftStaleness.includes(s.level);
                                        return (
                                            <button
                                                key={s.level}
                                                type="button"
                                                onClick={() => {
                                                    if (isChecked) {
                                                        setDraftStaleness(draftStaleness.filter(x => x !== s.level));
                                                    } else {
                                                        setDraftStaleness([...draftStaleness, s.level]);
                                                    }
                                                }}
                                                className={cn(
                                                    "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-colors cursor-pointer",
                                                    isChecked 
                                                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white font-bold" 
                                                        : "bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-650 text-gray-700 dark:text-gray-300"
                                                )}
                                                aria-pressed={isChecked}
                                            >
                                                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", s.color)} aria-hidden="true" />
                                                <span className="truncate">{s.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>

                        {/* Footer Modale Persistente con Conteggio in Tempo Reale */}
                        <div className="px-6 py-4 border-t border-gray-150 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 flex items-center justify-between gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setDraftRegions([]);
                                    setDraftProvinces([]);
                                    setDraftHasTents(false);
                                    setDraftHasBeds(false);
                                    setDraftMinBeds(null);
                                    setDraftHasAccantonamento(false);
                                    setDraftMinAccantonamento(null);
                                    setDraftHasHeating(false);
                                    setDraftHasWaterPoints(false);
                                    setDraftHasEquippedKitchen(false);
                                    setDraftHasGreenSpace(false);
                                    setDraftHasDisabledAccess(false);
                                    setDraftHasPoles(false);
                                    setDraftBranches([]);
                                    setDraftActivities([]);
                                    setDraftStaleness([]);
                                }}
                                className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                            >
                                Azzera bozza
                            </button>

                            <button
                                type="button"
                                onClick={applyDraftFilters}
                                className="px-6 py-2.5 rounded-xl bg-[#1B4931] hover:bg-[#133724] text-white text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                            >
                                Mostra {draftMatchCount} {draftMatchCount === 1 ? 'luogo' : 'luoghi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Rubrica Pullman & Trasporti */}
            {showTransportModal && (
                <TransportModal onClose={() => setShowTransportModal(false)} />
            )}
        </div>
    );
}
