import { useEffect, useState, useMemo } from 'react';
import { 
    Search, Plus, X, Check, Clock, Tent, BedDouble, 
    Bus, Sparkles, MapPin, List, Map as MapIcon, SlidersHorizontal, 
    Home as HomeIcon, ChevronRight, Droplets, Flame, Utensils, 
    Trees, Accessibility, ShieldCheck, WifiOff
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
import { isOnline as checkOnline } from '@/lib/offline';

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

interface StoredLocationFilters {
    searchTerm?: string;
    viewMode?: 'list' | 'map';
    selectedBranches?: string[];
    selectedRegions?: string[];
    selectedProvinces?: string[];
    participants?: number | null;
    hasTents?: boolean;
    hasBeds?: boolean;
    minBeds?: number | null;
    hasAccantonamento?: boolean;
    minAccantonamento?: number | null;
    hasEquippedKitchen?: boolean;
    hasGreenSpace?: boolean;
    hasWaterPoints?: boolean;
    hasHeating?: boolean;
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

type FilterModalTab = 'geography' | 'needs' | 'services' | 'activities' | 'staleness';

export default function Home({ defaultView = 'list' }: HomeProps) {
    const [locations, setLocations] = useState<Location[]>([]);
    const [initialFilters] = useState<StoredLocationFilters>(getInitialFilters);

    // Barra ricerca
    const [rawSearchTerm, setRawSearchTerm] = useState(() => initialFilters.searchTerm || '');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => initialFilters.searchTerm || '');

    // Modalità vista (Elenco / Mappa)
    const [viewMode, setViewMode] = useState<'list' | 'map'>(() => defaultView || initialFilters.viewMode || 'list');

    // Stato modale filtri
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [filterModalTab, setFilterModalTab] = useState<FilterModalTab>('geography');

    // Filtri applicati effettivi
    const [selectedBranches, setSelectedBranches] = useState<string[]>(() => initialFilters.selectedBranches || []);
    const [selectedRegions, setSelectedRegions] = useState<string[]>(() => initialFilters.selectedRegions || []);
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>(() => initialFilters.selectedProvinces || []);
    const [participants, setParticipants] = useState<number | null>(() => initialFilters.participants ?? null);
    const [hasTents, setHasTents] = useState(() => initialFilters.hasTents || false);
    const [hasBeds, setHasBeds] = useState(() => initialFilters.hasBeds || false);
    const [minBeds, setMinBeds] = useState<number | null>(() => initialFilters.minBeds ?? null);
    const [hasAccantonamento, setHasAccantonamento] = useState(() => initialFilters.hasAccantonamento || false);
    const [minAccantonamento, setMinAccantonamento] = useState<number | null>(() => initialFilters.minAccantonamento ?? null);
    const [hasEquippedKitchen, setHasEquippedKitchen] = useState(() => initialFilters.hasEquippedKitchen || false);
    const [hasGreenSpace, setHasGreenSpace] = useState(() => initialFilters.hasGreenSpace || false);
    const [hasWaterPoints, setHasWaterPoints] = useState(() => initialFilters.hasWaterPoints || false);
    const [hasHeating, setHasHeating] = useState(() => initialFilters.hasHeating || false);
    const [hasDisabledAccess, setHasDisabledAccess] = useState(() => initialFilters.hasDisabledAccess || false);
    const [hasPoles, setHasPoles] = useState(() => initialFilters.hasPoles || false);
    const [selectedActivities, setSelectedActivities] = useState<string[]>(() => initialFilters.selectedActivities || []);
    const [selectedStaleness, setSelectedStaleness] = useState<number[]>(() => initialFilters.selectedStaleness || []);

    // Bozza locale (Draft) usata dentro il modale filtri
    const [draftRegions, setDraftRegions] = useState<string[]>([]);
    const [draftProvinces, setDraftProvinces] = useState<string[]>([]);
    const [draftProvinceSearch, setDraftProvinceSearch] = useState('');
    const [draftParticipants, setDraftParticipants] = useState<number | null>(null);
    const [draftHasTents, setDraftHasTents] = useState(false);
    const [draftHasBeds, setDraftHasBeds] = useState(false);
    const [draftMinBeds, setDraftMinBeds] = useState<number | null>(null);
    const [draftHasAccantonamento, setDraftHasAccantonamento] = useState(false);
    const [draftMinAccantonamento, setDraftMinAccantonamento] = useState<number | null>(null);
    const [draftHasEquippedKitchen, setDraftHasEquippedKitchen] = useState(false);
    const [draftHasGreenSpace, setDraftHasGreenSpace] = useState(false);
    const [draftHasWaterPoints, setDraftHasWaterPoints] = useState(false);
    const [draftHasHeating, setDraftHasHeating] = useState(false);
    const [draftHasDisabledAccess, setDraftHasDisabledAccess] = useState(false);
    const [draftHasPoles, setDraftHasPoles] = useState(false);
    const [draftBranches, setDraftBranches] = useState<string[]>([]);
    const [draftActivities, setDraftActivities] = useState<string[]>([]);
    const [draftStaleness, setDraftStaleness] = useState<number[]>([]);

    // Stato utente, richieste CoCa e connettività
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [pendingCoCaUsers, setPendingCoCaUsers] = useState<UserType[]>([]);
    const [locationViews, setLocationViews] = useState<Record<string, string>>({});
    const [showTransportModal, setShowTransportModal] = useState(false);
    const [isOnline, setIsOnline] = useState(() => checkOnline());

    // Debounce della ricerca testuale (300ms) senza perdere il focus del cursore
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(rawSearchTerm);
            if (!sessionStorage.getItem('search_done') && rawSearchTerm.trim().length > 2) {
                sessionStorage.setItem('search_done', '1');
                const stats: any = { locationsSearched: 1 };
                selectedBranches.forEach(branch => {
                    if (branch === 'L/C') stats.searchesLC = (stats.searchesLC || 0) + 1;
                    if (branch === 'E/G') stats.searchesEG = (stats.searchesEG || 0) + 1;
                    if (branch === 'R/S') stats.searchesRS = (stats.searchesRS || 0) + 1;
                    if (branch === 'Co.Ca.') stats.searchesCoCa = (stats.searchesCoCa || 0) + 1;
                    if (branch === 'Gruppo') stats.searchesGruppo = (stats.searchesGruppo || 0) + 1;
                });
                addPointsWithStats(1, stats).catch(console.error);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [rawSearchTerm, selectedBranches]);

    // Rilevamento stato online/offline
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Salvataggio filtri in sessionStorage
    useEffect(() => {
        const hasAnyActiveFilter = 
            Boolean(debouncedSearchTerm.trim()) ||
            selectedBranches.length > 0 ||
            selectedRegions.length > 0 ||
            selectedProvinces.length > 0 ||
            selectedActivities.length > 0 ||
            selectedStaleness.length > 0 ||
            (participants !== null && participants > 0) ||
            hasTents ||
            hasBeds ||
            (minBeds !== null && minBeds > 0) ||
            hasAccantonamento ||
            (minAccantonamento !== null && minAccantonamento > 0) ||
            hasEquippedKitchen ||
            hasGreenSpace ||
            hasWaterPoints ||
            hasHeating ||
            hasDisabledAccess ||
            hasPoles ||
            viewMode !== defaultView;

        if (hasAnyActiveFilter) {
            const dataToSave: StoredLocationFilters = {
                searchTerm: debouncedSearchTerm,
                viewMode,
                selectedBranches,
                selectedRegions,
                selectedProvinces,
                participants,
                selectedActivities,
                selectedStaleness,
                hasTents,
                hasBeds,
                minBeds,
                hasAccantonamento,
                minAccantonamento,
                hasEquippedKitchen,
                hasGreenSpace,
                hasWaterPoints,
                hasHeating,
                hasDisabledAccess,
                hasPoles
            };
            sessionStorage.setItem('orme_location_filters', JSON.stringify(dataToSave));
        } else {
            sessionStorage.removeItem('orme_location_filters');
        }
    }, [
        debouncedSearchTerm, viewMode, defaultView, selectedBranches, selectedRegions,
        selectedProvinces, participants, selectedActivities, selectedStaleness,
        hasTents, hasBeds, minBeds, hasAccantonamento, minAccantonamento,
        hasEquippedKitchen, hasGreenSpace, hasWaterPoints, hasHeating,
        hasDisabledAccess, hasPoles
    ]);

    // Ripristino scroll verticale
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
    useEffect(() => {
        getLocations().then(setLocations).catch(console.error);
        getUser().then(u => {
            setCurrentUser(u);
            if (u && u.membershipStatus === 'attivo' && (u.groupId || u.groupName)) {
                getAllUsers().then(users => {
                    const pending = users.filter(usr => usr.membershipStatus === 'in_attesa');
                    setPendingCoCaUsers(pending);
                }).catch(console.error);
            }
        }).catch(console.error);
        getUserLocationViews().then(setLocationViews).catch(console.error);

        const params = new URLSearchParams(window.location.search);
        if (params.get('transport') === 'true') {
            setShowTransportModal(true);
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, []);

    // Helper per determinare se ci sono modifiche non lette per la scheda
    const getUnreadCount = (loc: Location) => {
        if (!currentUser || !loc.lastUpdatedAt) return 0;
        if (loc.lastUpdatedBy === currentUser.id || loc.lastUpdatedBy === currentUser.nickname) return 0;
        const lastViewedAt = locationViews[loc.id];
        const editTime = new Date(loc.lastUpdatedAt).getTime();
        const viewTime = lastViewedAt ? new Date(lastViewedAt).getTime() : 0;
        return editTime > viewTime ? 1 : 0;
    };

    // Apertura del modale filtri con copia dei parametri attivi nella bozza (Draft)
    const openFiltersModalWithTab = (tab: FilterModalTab) => {
        setFilterModalTab(tab);
        setDraftRegions([...selectedRegions]);
        setDraftProvinces([...selectedProvinces]);
        setDraftProvinceSearch('');
        setDraftParticipants(participants);
        setDraftHasTents(hasTents);
        setDraftHasBeds(hasBeds);
        setDraftMinBeds(minBeds);
        setDraftHasAccantonamento(hasAccantonamento);
        setDraftMinAccantonamento(minAccantonamento);
        setDraftHasEquippedKitchen(hasEquippedKitchen);
        setDraftHasGreenSpace(hasGreenSpace);
        setDraftHasWaterPoints(hasWaterPoints);
        setDraftHasHeating(hasHeating);
        setDraftHasDisabledAccess(hasDisabledAccess);
        setDraftHasPoles(hasPoles);
        setDraftBranches([...selectedBranches]);
        setDraftActivities([...selectedActivities]);
        setDraftStaleness([...selectedStaleness]);
        setShowFiltersModal(true);
    };

    // Applicazione della bozza ai filtri effettivi
    const applyDraftFilters = () => {
        setSelectedRegions(draftRegions);
        setSelectedProvinces(draftProvinces);
        setParticipants(draftParticipants);
        setHasTents(draftHasTents);
        setHasBeds(draftHasBeds);
        setMinBeds(draftMinBeds);
        setHasAccantonamento(draftHasAccantonamento);
        setMinAccantonamento(draftMinAccantonamento);
        setHasEquippedKitchen(draftHasEquippedKitchen);
        setHasGreenSpace(draftHasGreenSpace);
        setHasWaterPoints(draftHasWaterPoints);
        setHasHeating(draftHasHeating);
        setHasDisabledAccess(draftHasDisabledAccess);
        setHasPoles(draftHasPoles);
        setSelectedBranches(draftBranches);
        setSelectedActivities(draftActivities);
        setSelectedStaleness(draftStaleness);
        setShowFiltersModal(false);
    };

    // Azzeramento totale dei filtri
    const resetAllFilters = () => {
        setRawSearchTerm('');
        setDebouncedSearchTerm('');
        setSelectedBranches([]);
        setSelectedRegions([]);
        setSelectedProvinces([]);
        setParticipants(null);
        setHasTents(false);
        setHasBeds(false);
        setMinBeds(null);
        setHasAccantonamento(false);
        setMinAccantonamento(null);
        setHasEquippedKitchen(false);
        setHasGreenSpace(false);
        setHasWaterPoints(false);
        setHasHeating(false);
        setHasDisabledAccess(false);
        setHasPoles(false);
        setSelectedActivities([]);
        setSelectedStaleness([]);
        sessionStorage.removeItem('orme_location_filters');
        sessionStorage.removeItem('orme_location_scroll_y');
    };

    // Azzeramento della sola bozza nel modale
    const resetDraftFilters = () => {
        setDraftRegions([]);
        setDraftProvinces([]);
        setDraftProvinceSearch('');
        setDraftParticipants(null);
        setDraftHasTents(false);
        setDraftHasBeds(false);
        setDraftMinBeds(null);
        setDraftHasAccantonamento(false);
        setDraftMinAccantonamento(null);
        setDraftHasEquippedKitchen(false);
        setDraftHasGreenSpace(false);
        setDraftHasWaterPoints(false);
        setDraftHasHeating(false);
        setDraftHasDisabledAccess(false);
        setDraftHasPoles(false);
        setDraftBranches([]);
        setDraftActivities([]);
        setDraftStaleness([]);
    };

    // Calcolo delle province disponibili per la bozza
    const availableDraftProvinces = useMemo(() => {
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
        if (!draftProvinceSearch.trim()) return availableDraftProvinces;
        const q = draftProvinceSearch.trim().toLowerCase();
        return availableDraftProvinces.filter(p => {
            const code = (PROVINCE_TO_CODE[p] || '').toLowerCase();
            return p.toLowerCase().includes(q) || code.includes(q);
        });
    }, [availableDraftProvinces, draftProvinceSearch]);

    // Toggle regione nella bozza con disinnesco automatico delle province diventate incompatibili
    const toggleDraftRegion = (region: string) => {
        const next = draftRegions.includes(region)
            ? draftRegions.filter(r => r !== region)
            : [...draftRegions, region];
        setDraftRegions(next);

        if (next.length > 0) {
            const allowed = new Set([
                ...next.flatMap(r => (ITALIAN_PROVINCIAL_DATA[r] || []).map(p => p.toLowerCase())),
                ...locations.filter(l => next.includes(l.region)).map(l => (l.province || '').trim().toLowerCase())
            ]);
            setDraftProvinces(prev => prev.filter(p => allowed.has(p.toLowerCase())));
        }
    };

    // Funzione pura di filtraggio usata sia per i risultati effettivi che per il calcolo in tempo reale della bozza
    const filterLocationsWithCriteria = (
        locs: Location[],
        searchQuery: string,
        regions: string[],
        provinces: string[],
        partCount: number | null,
        tents: boolean,
        beds: boolean,
        minBedsCount: number | null,
        accantonamento: boolean,
        minAccantonamentoCount: number | null,
        equippedKitchen: boolean,
        greenSpace: boolean,
        waterPoints: boolean,
        heating: boolean,
        disabledAccess: boolean,
        poles: boolean,
        branches: string[],
        activities: string[],
        stalenessList: number[]
    ) => {
        return locs.filter(loc => {
            // 1. Ricerca testuale
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesSearch = 
                    loc.name.toLowerCase().includes(q) ||
                    loc.commune.toLowerCase().includes(q) ||
                    loc.region.toLowerCase().includes(q) ||
                    (loc.province && loc.province.toLowerCase().includes(q));
                if (!matchesSearch) return false;
            }

            // 2. Regione e Provincia
            if (regions.length > 0 && !regions.includes(loc.region)) {
                return false;
            }
            if (provinces.length > 0) {
                if (!loc.province) return false;
                const locNorm = loc.province.trim().toLowerCase();
                const locCode = (PROVINCE_TO_CODE[loc.province] || '').toLowerCase();
                const hasMatch = provinces.some(p => {
                    const pNorm = p.trim().toLowerCase();
                    const pCode = (PROVINCE_TO_CODE[p] || '').toLowerCase();
                    return locNorm === pNorm || (pCode && locNorm === pCode) || (locCode && pNorm === locCode);
                });
                if (!hasMatch) return false;
            }

            // 3. Partecipanti & Sistemazione
            if (partCount !== null && partCount > 0) {
                // Se è specificato un numero partecipanti, consideriamo valido se la struttura ha letti sufficienti, o accantonamento sufficiente, o spazio tende dichiarato
                const hasEnoughBeds = (loc.beds || 0) >= partCount;
                const hasEnoughAccantonamento = (loc.accantonamentoCapacity || 0) >= partCount;
                const hasTentsDeclared = Boolean(loc.hasTents);
                if (!hasEnoughBeds && !hasEnoughAccantonamento && !hasTentsDeclared) {
                    return false;
                }
            }

            if (tents && !loc.hasTents) return false;
            if (minBedsCount !== null && minBedsCount > 0) {
                if ((loc.beds || 0) < minBedsCount) return false;
            } else if (beds && (loc.beds || 0) <= 0) {
                return false;
            }

            if (minAccantonamentoCount !== null && minAccantonamentoCount > 0) {
                if ((loc.accantonamentoCapacity || 0) < minAccantonamentoCount) return false;
            } else if (accantonamento && (loc.accantonamentoCapacity || 0) <= 0) {
                return false;
            }

            // 4. Servizi e dotazioni
            if (equippedKitchen && !loc.hasEquippedKitchen) return false;
            if (greenSpace && !loc.hasGreenSpace) return false;
            if (waterPoints && !loc.hasWaterPoints) return false;
            if (heating && !loc.hasHeating) return false;
            if (disabledAccess && !loc.hasDisabledAccess) return false;
            if (poles && !loc.hasPoles) return false;

            // 5. Branche & Attività
            if (branches.length > 0) {
                const validActivities = branches.flatMap(b => BRANCH_ACTIVITIES[b] || []);
                const matchesBranch = loc.activities.some(act => validActivities.includes(act));
                if (!matchesBranch) return false;
            }
            if (activities.length > 0) {
                const matchesActivity = loc.activities.some(act => activities.includes(act));
                if (!matchesActivity) return false;
            }

            // 6. Freschezza dati
            if (stalenessList.length > 0) {
                const info = getStalenessInfo(loc.lastUpdatedAt);
                if (!stalenessList.includes(info.level)) return false;
            }

            return true;
        });
    };

    // Risultati filtrati effettivi
    const filteredLocations = useMemo(() => {
        return filterLocationsWithCriteria(
            locations,
            debouncedSearchTerm,
            selectedRegions,
            selectedProvinces,
            participants,
            hasTents,
            hasBeds,
            minBeds,
            hasAccantonamento,
            minAccantonamento,
            hasEquippedKitchen,
            hasGreenSpace,
            hasWaterPoints,
            hasHeating,
            hasDisabledAccess,
            hasPoles,
            selectedBranches,
            selectedActivities,
            selectedStaleness
        );
    }, [
        locations, debouncedSearchTerm, selectedRegions, selectedProvinces,
        participants, hasTents, hasBeds, minBeds, hasAccantonamento,
        minAccantonamento, hasEquippedKitchen, hasGreenSpace, hasWaterPoints,
        hasHeating, hasDisabledAccess, hasPoles, selectedBranches,
        selectedActivities, selectedStaleness
    ]);

    // Conteggio in tempo reale della bozza dei filtri dentro il modale
    const draftMatchesCount = useMemo(() => {
        if (!showFiltersModal) return 0;
        return filterLocationsWithCriteria(
            locations,
            debouncedSearchTerm,
            draftRegions,
            draftProvinces,
            draftParticipants,
            draftHasTents,
            draftHasBeds,
            draftMinBeds,
            draftHasAccantonamento,
            draftMinAccantonamento,
            draftHasEquippedKitchen,
            draftHasGreenSpace,
            draftHasWaterPoints,
            draftHasHeating,
            draftHasDisabledAccess,
            draftHasPoles,
            draftBranches,
            draftActivities,
            draftStaleness
        ).length;
    }, [
        showFiltersModal, locations, debouncedSearchTerm, draftRegions,
        draftProvinces, draftParticipants, draftHasTents, draftHasBeds,
        draftMinBeds, draftHasAccantonamento, draftMinAccantonamento,
        draftHasEquippedKitchen, draftHasGreenSpace, draftHasWaterPoints,
        draftHasHeating, draftHasDisabledAccess, draftHasPoles,
        draftBranches, draftActivities, draftStaleness
    ]);

    // Calcolo coordinate per la mappa
    const locationsWithCoordsCount = useMemo(() => {
        return filteredLocations.filter(l => l.coordinates && l.coordinates.lat && l.coordinates.lng).length;
    }, [filteredLocations]);

    const locationsWithoutCoordsCount = filteredLocations.length - locationsWithCoordsCount;

    // Conteggio dei criteri attivi (esclusa la ricerca testuale)
    const activeFiltersCount =
        selectedBranches.length +
        selectedRegions.length +
        selectedProvinces.length +
        (participants !== null && participants > 0 ? 1 : 0) +
        (hasTents ? 1 : 0) +
        ((minBeds !== null && minBeds > 0) || hasBeds ? 1 : 0) +
        ((minAccantonamento !== null && minAccantonamento > 0) || hasAccantonamento ? 1 : 0) +
        (hasEquippedKitchen ? 1 : 0) +
        (hasGreenSpace ? 1 : 0) +
        (hasWaterPoints ? 1 : 0) +
        (hasHeating ? 1 : 0) +
        (hasDisabledAccess ? 1 : 0) +
        (hasPoles ? 1 : 0) +
        selectedActivities.length +
        selectedStaleness.length;

    // Etichetta del pulsante "Zona"
    const zoneButtonLabel = useMemo(() => {
        if (selectedProvinces.length > 0) {
            if (selectedProvinces.length <= 2) {
                return `Zona · ${selectedProvinces.join(', ')}`;
            }
            return `Zona · ${selectedProvinces[0]} +${selectedProvinces.length - 1}`;
        }
        if (selectedRegions.length > 0) {
            if (selectedRegions.length <= 2) {
                return `Zona · ${selectedRegions.join(', ')}`;
            }
            return `Zona · ${selectedRegions[0]} +${selectedRegions.length - 1}`;
        }
        return 'Zona · Tutta Italia';
    }, [selectedRegions, selectedProvinces]);

    // Chiusura del modale con Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showFiltersModal) {
                setShowFiltersModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showFiltersModal]);

    return (
        <div className="max-w-7xl mx-auto space-y-5 relative min-h-[calc(100vh-140px)] pb-16 w-full min-w-0 max-w-full overflow-x-hidden">
            {/* Banner Stato Offline */}
            {!isOnline && (
                <div className="bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold">
                    <div className="flex items-center gap-2">
                        <WifiOff size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Modalità Offline: Stai consultando i luoghi salvati nella memoria del dispositivo.</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
                        Cache Locale
                    </span>
                </div>
            )}

            {/* Testata Locale con Titolo e Azioni Secondarie */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                        Luoghi per uscite e campi
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                        Basi scout, accantonamenti e terreni per tende in tutta Italia
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        to="/add"
                        className="h-10 px-4 rounded-xl bg-scout-green hover:bg-scout-green-dark text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-xs transition-all active:scale-95 select-none"
                    >
                        <Plus size={16} className="shrink-0" />
                        <span>Aggiungi luogo</span>
                    </Link>
                </div>
            </div>

            {/* Banner Richieste Accesso CoCa in Sospeso */}
            {pendingCoCaUsers.length > 0 && (
                <Link
                    to="/verbali/membri?tab=sicurezza"
                    className="block bg-amber-500/10 border-2 border-amber-500/40 hover:border-amber-500 rounded-2xl p-4 transition-all shadow-xs group"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs animate-pulse">
                                <Clock size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                                    {pendingCoCaUsers.length === 1 ? '1 nuova richiesta di accesso alla Comunità Capi' : `${pendingCoCaUsers.length} nuove richieste di accesso alla Comunità Capi`}
                                </h3>
                                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                                    {pendingCoCaUsers.map(u => `${u.firstName} ${u.lastName}${u.nickname ? ` (${u.nickname})` : ''}`).join(', ')} in attesa di approvazione.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 group-hover:translate-x-1 transition-transform self-end sm:self-auto shrink-0 bg-amber-500/20 px-3 py-1.5 rounded-xl">
                            <span>Esamina</span>
                            <ChevronRight size={14} />
                        </div>
                    </div>
                </Link>
            )}

            {/* Barra di Ricerca Principale (Altezza 48px) */}
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Search size={20} className="text-scout-green dark:text-emerald-400" />
                </div>
                <input
                    type="text"
                    value={rawSearchTerm}
                    onChange={(e) => setRawSearchTerm(e.target.value)}
                    placeholder="Nome, comune o provincia..."
                    className="w-full h-12 pl-12 pr-11 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-250 dark:border-gray-700 text-sm sm:text-base font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-scout-green placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all"
                    aria-label="Cerca luoghi per nome, comune o provincia"
                />
                {rawSearchTerm && (
                    <button
                        type="button"
                        onClick={() => {
                            setRawSearchTerm('');
                            setDebouncedSearchTerm('');
                        }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full cursor-pointer transition-colors"
                        title="Cancella ricerca"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Controlli Filtri & Accessi Rapidi (Grid Compatta e Ordinata) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Controllo Zona Geografica */}
                <button
                    type="button"
                    onClick={() => openFiltersModalWithTab('geography')}
                    className={cn(
                        "h-11 px-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-2xs transition-all active:scale-[0.98] cursor-pointer",
                        selectedRegions.length > 0 || selectedProvinces.length > 0
                            ? "bg-scout-green text-white border-scout-green"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-250 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                    )}
                    title="Seleziona la zona geografica (Regione o Provincia)"
                >
                    <div className="flex items-center gap-2 truncate">
                        <MapPin size={16} className="shrink-0" />
                        <span className="truncate">{zoneButtonLabel}</span>
                    </div>
                </button>

                {/* Controllo Filtri Esigenze e Servizi */}
                <button
                    type="button"
                    onClick={() => openFiltersModalWithTab('needs')}
                    className={cn(
                        "h-11 px-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-2xs transition-all active:scale-[0.98] cursor-pointer",
                        activeFiltersCount > 0
                            ? "bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300/40"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-250 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                    )}
                    title="Filtra per partecipanti, sistemazione, cucina e servizi"
                >
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal size={16} className="shrink-0" />
                        <span>Filtri</span>
                    </div>
                    {activeFiltersCount > 0 && (
                        <span className="bg-white text-amber-700 text-xs font-black px-2 py-0.5 rounded-full shrink-0">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>

                {/* Pullman & Trasporti */}
                <button
                    type="button"
                    onClick={() => setShowTransportModal(true)}
                    className="h-11 px-3.5 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-250 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-[0.98] cursor-pointer truncate"
                    title="Apri la rubrica ditte pullman e preventivi di viaggio"
                >
                    <Bus size={16} className="text-scout-blue shrink-0" />
                    <span className="truncate">Pullman e trasporti</span>
                </button>

                {/* Akela AI Assistant */}
                <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-akela'))}
                    className="h-11 px-3.5 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-250 dark:border-gray-700 hover:border-scout-green hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-[0.98] cursor-pointer truncate"
                    title="Chiedi supporto metodologico ad Akela AI"
                >
                    <Sparkles size={16} className="text-amber-500 shrink-0" />
                    <span className="truncate">Akela AI</span>
                </button>
            </div>

            {/* Chip dei Criteri Applicati (Vanno a capo naturalmente) */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 mr-1">
                        Criteri attivi:
                    </span>

                    {/* Regioni */}
                    {selectedRegions.map(reg => (
                        <span
                            key={reg}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-scout-green-dark dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50"
                        >
                            <span>{reg}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = selectedRegions.filter(r => r !== reg);
                                    setSelectedRegions(next);
                                    if (next.length > 0) {
                                        const allowed = new Set(next.flatMap(r => (ITALIAN_PROVINCIAL_DATA[r] || []).map(p => p.toLowerCase())));
                                        setSelectedProvinces(prev => prev.filter(p => allowed.has(p.toLowerCase())));
                                    }
                                }}
                                className="p-0.5 hover:bg-emerald-200/50 rounded-full cursor-pointer"
                                aria-label={`Rimuovi filtro regione ${reg}`}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}

                    {/* Province */}
                    {selectedProvinces.map(prov => (
                        <span
                            key={prov}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-scout-green-dark dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50"
                        >
                            <span>{prov}{PROVINCE_TO_CODE[prov] ? ` (${PROVINCE_TO_CODE[prov]})` : ''}</span>
                            <button
                                type="button"
                                onClick={() => setSelectedProvinces(selectedProvinces.filter(p => p !== prov))}
                                className="p-0.5 hover:bg-emerald-200/50 rounded-full cursor-pointer"
                                aria-label={`Rimuovi filtro provincia ${prov}`}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}

                    {/* Partecipanti */}
                    {participants !== null && participants > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-scout-blue border border-blue-200/80 dark:border-blue-800/50">
                            <span>≥ {participants} partecipanti</span>
                            <button
                                type="button"
                                onClick={() => setParticipants(null)}
                                className="p-0.5 hover:bg-blue-200/50 rounded-full cursor-pointer"
                                aria-label="Rimuovi filtro partecipanti"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    {/* Letti */}
                    {minBeds !== null && minBeds > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-scout-blue border border-blue-200/80 dark:border-blue-800/50">
                            <BedDouble size={12} />
                            <span>≥ {minBeds} letti</span>
                            <button
                                type="button"
                                onClick={() => { setMinBeds(null); setHasBeds(false); }}
                                className="p-0.5 hover:bg-blue-200/50 rounded-full cursor-pointer"
                                aria-label="Rimuovi filtro letti minimi"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasBeds && (minBeds === null || minBeds === 0) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-scout-blue border border-blue-200/80 dark:border-blue-800/50">
                            <BedDouble size={12} />
                            <span>Posti letto</span>
                            <button
                                type="button"
                                onClick={() => setHasBeds(false)}
                                className="p-0.5 hover:bg-blue-200/50 rounded-full cursor-pointer"
                                aria-label="Rimuovi filtro posti letto"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    {/* Spazio tende */}
                    {hasTents && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-scout-green-dark dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50">
                            <Tent size={12} />
                            <span>Spazio tende</span>
                            <button
                                type="button"
                                onClick={() => setHasTents(false)}
                                className="p-0.5 hover:bg-emerald-200/50 rounded-full cursor-pointer"
                                aria-label="Rimuovi filtro spazio tende"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    {/* Accantonamento */}
                    {minAccantonamento !== null && minAccantonamento > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50">
                            <HomeIcon size={12} />
                            <span>≥ {minAccantonamento} a terra</span>
                            <button
                                type="button"
                                onClick={() => { setMinAccantonamento(null); setHasAccantonamento(false); }}
                                className="p-0.5 hover:bg-amber-200/50 rounded-full cursor-pointer"
                                aria-label="Rimuovi filtro accantonamento"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasAccantonamento && (minAccantonamento === null || minAccantonamento === 0) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50">
                            <HomeIcon size={12} />
                            <span>Accantonamento</span>
                            <button
                                type="button"
                                onClick={() => setHasAccantonamento(false)}
                                className="p-0.5 hover:bg-amber-200/50 rounded-full cursor-pointer"
                                aria-label="Rimuovi filtro accantonamento"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    {/* Servizi */}
                    {hasEquippedKitchen && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-250 dark:border-gray-600">
                            <Utensils size={12} />
                            <span>Cucina attrezzata</span>
                            <button type="button" onClick={() => setHasEquippedKitchen(false)} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full cursor-pointer">
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasGreenSpace && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-250 dark:border-gray-600">
                            <Trees size={12} />
                            <span>Spazio verde</span>
                            <button type="button" onClick={() => setHasGreenSpace(false)} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full cursor-pointer">
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasWaterPoints && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-250 dark:border-gray-600">
                            <Droplets size={12} />
                            <span>Punti d'acqua</span>
                            <button type="button" onClick={() => setHasWaterPoints(false)} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full cursor-pointer">
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasHeating && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-250 dark:border-gray-600">
                            <Flame size={12} />
                            <span>Riscaldato</span>
                            <button type="button" onClick={() => setHasHeating(false)} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full cursor-pointer">
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasDisabledAccess && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-250 dark:border-gray-600">
                            <Accessibility size={12} />
                            <span>Accesso disabili</span>
                            <button type="button" onClick={() => setHasDisabledAccess(false)} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full cursor-pointer">
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {hasPoles && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-250 dark:border-gray-600">
                            <span>Pali da costruzione</span>
                            <button type="button" onClick={() => setHasPoles(false)} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full cursor-pointer">
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    {/* Branche */}
                    {selectedBranches.map(b => (
                        <span key={b} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-250 dark:border-gray-600">
                            <span>Branca {b}</span>
                            <button type="button" onClick={() => setSelectedBranches(selectedBranches.filter(i => i !== b))} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full cursor-pointer">
                                <X size={12} />
                            </button>
                        </span>
                    ))}

                    {/* Pulsante Azzera Tutti */}
                    <button
                        type="button"
                        onClick={resetAllFilters}
                        className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline ml-1 cursor-pointer"
                    >
                        Azzera tutti
                    </button>
                </div>
            )}

            {/* Barra Risultati & Switcher Elenco/Mappa */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-1">
                {/* Conteggio Risultati */}
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                    <span className="w-2 h-2 rounded-full bg-scout-green shrink-0" />
                    <span>
                        {filteredLocations.length} {filteredLocations.length === 1 ? 'luogo' : 'luoghi'} · {locationsWithCoordsCount} sulla mappa
                    </span>
                    {locationsWithoutCoordsCount > 0 && (
                        <span className="text-gray-400 dark:text-gray-500 font-normal">
                            ({locationsWithoutCoordsCount} senza coordinate)
                        </span>
                    )}
                </div>

                {/* Controllo Segmentato Elenco / Mappa */}
                <div className="inline-flex bg-gray-150 dark:bg-gray-750 p-1 rounded-xl shrink-0 border border-gray-200/80 dark:border-gray-700/80 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[38px]",
                            viewMode === 'list'
                                ? "bg-white dark:bg-gray-850 text-scout-green-dark dark:text-emerald-300 shadow-xs font-black"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        )}
                        aria-pressed={viewMode === 'list'}
                    >
                        <List size={15} />
                        <span>Elenco</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode('map')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[38px]",
                            viewMode === 'map'
                                ? "bg-white dark:bg-gray-850 text-scout-green-dark dark:text-emerald-300 shadow-xs font-black"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        )}
                        aria-pressed={viewMode === 'map'}
                    >
                        <MapIcon size={15} />
                        <span>Mappa</span>
                    </button>
                </div>
            </div>

            {/* Contenuto: Elenco Schede oppure Mappa */}
            {viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0 max-w-full">
                    {(currentUser ? filteredLocations : filteredLocations.slice(0, 5)).map((location) => (
                        <LocationCard 
                            key={location.id} 
                            location={location} 
                            unreadModificationsCount={getUnreadCount(location)} 
                        />
                    ))}

                    {/* Invito alla registrazione per utenti non autenticati */}
                    {!currentUser && filteredLocations.length > 5 && (
                        <div className="col-span-full mt-6 p-7 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-scout-green/30 text-center space-y-3.5 shadow-xs">
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-scout-green dark:text-emerald-400 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto">
                                <Plus size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                Vuoi visualizzare tutti i luoghi?
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                Accedi o crea un account gratuito per consultare l'intero catalogo di {locations.length} strutture scout, recensioni e numeri di custodi verificati.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
                                <Link to="/register" className="bg-scout-green hover:bg-scout-green-dark text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all">
                                    Registrati gratuitamente
                                </Link>
                                <Link to="/login" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                                    Accedi
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Stato Vuoto (Zero Risultati) */}
                    {filteredLocations.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-750 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                <Search size={28} />
                            </div>
                            <div className="max-w-md space-y-1">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    Nessun luogo corrisponde a tutti i criteri
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    Prova ad allargare la zona geografica o a rimuovere qualche filtro per visualizzare più candidati.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2.5 justify-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => openFiltersModalWithTab('needs')}
                                    className="px-4 py-2 rounded-xl bg-scout-green text-white text-xs font-bold hover:bg-scout-green-dark transition-all cursor-pointer"
                                >
                                    Modifica filtri
                                </button>
                                {activeFiltersCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={resetAllFilters}
                                        className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-650 transition-all cursor-pointer"
                                    >
                                        Azzera tutti i filtri
                                    </button>
                                )}
                                <Link
                                    to="/add"
                                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold hover:border-scout-green transition-all"
                                >
                                    + Aggiungi un nuovo luogo
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {locationsWithoutCoordsCount > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100/70 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <span>
                                {locationsWithoutCoordsCount} {locationsWithoutCoordsCount === 1 ? 'luogo non dispone di coordinate GPS precise ed è consultabile' : 'luoghi non dispongono di coordinate GPS precise e sono consultabili'} nell'elenco schede.
                            </span>
                        </div>
                    )}
                    <InteractiveMap locations={currentUser ? filteredLocations : filteredLocations.slice(0, 5)} />
                </div>
            )}

            {/* Transport Directory Modal */}
            {showTransportModal && (
                <TransportModal onClose={() => setShowTransportModal(false)} />
            )}

            {/* ========================================================================= */}
            {/* PANNELLO FILTRI (DIALOG MODAL CON BOZZA DRAFT)                            */}
            {/* ========================================================================= */}
            {showFiltersModal && (
                <div 
                    className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => setShowFiltersModal(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="filters-dialog-title"
                >
                    <div 
                        className="bg-white dark:bg-gray-850 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden" 
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header Dialog */}
                        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-150 dark:border-gray-750">
                            <div>
                                <h2 id="filters-dialog-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    Filtra luoghi
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    Seleziona zona e requisiti del gruppo
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowFiltersModal(false)} 
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                                aria-label="Chiudi finestra filtri"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Schede di Navigazione Sezioni Filtri */}
                        <div className="flex overflow-x-auto px-4 pt-2.5 pb-1 gap-1 border-b border-gray-100 dark:border-gray-750 no-scrollbar">
                            <button
                                type="button"
                                onClick={() => setFilterModalTab('geography')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                                    filterModalTab === 'geography'
                                        ? "bg-scout-green text-white shadow-xs"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                                )}
                            >
                                <MapPin size={13} />
                                <span>Zona</span>
                                {(draftRegions.length > 0 || draftProvinces.length > 0) && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setFilterModalTab('needs')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                                    filterModalTab === 'needs'
                                        ? "bg-scout-green text-white shadow-xs"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                                )}
                            >
                                <BedDouble size={13} />
                                <span>Partecipanti & Letti</span>
                                {(draftParticipants || draftHasTents || draftHasBeds || draftMinBeds || draftHasAccantonamento || draftMinAccantonamento) && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setFilterModalTab('services')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                                    filterModalTab === 'services'
                                        ? "bg-scout-green text-white shadow-xs"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                                )}
                            >
                                <Utensils size={13} />
                                <span>Servizi</span>
                                {(draftHasEquippedKitchen || draftHasGreenSpace || draftHasWaterPoints || draftHasHeating || draftHasDisabledAccess || draftHasPoles) && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setFilterModalTab('activities')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                                    filterModalTab === 'activities'
                                        ? "bg-scout-green text-white shadow-xs"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                                )}
                            >
                                <span>⚜️ Branche</span>
                                {(draftBranches.length > 0 || draftActivities.length > 0) && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setFilterModalTab('staleness')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                                    filterModalTab === 'staleness'
                                        ? "bg-scout-green text-white shadow-xs"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                                )}
                            >
                                <Clock size={13} />
                                <span>Stato Dati</span>
                                {draftStaleness.length > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                )}
                            </button>
                        </div>

                        {/* Corpo Scrollabile del Modale */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* TAB 1: ZONA GEOGRAFICA */}
                            {filterModalTab === 'geography' && (
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Regione
                                            </h3>
                                            {draftRegions.length > 0 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setDraftRegions([])} 
                                                    className="text-xs text-red-500 hover:underline font-bold cursor-pointer"
                                                >
                                                    Deseleziona tutte ({draftRegions.length})
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1 border border-gray-150 dark:border-gray-700/60 rounded-xl bg-gray-50/50 dark:bg-gray-800/40">
                                            {ITALIAN_REGIONS.map(region => {
                                                const isSelected = draftRegions.includes(region);
                                                return (
                                                    <button
                                                        key={region}
                                                        type="button"
                                                        onClick={() => toggleDraftRegion(region)}
                                                        className={cn(
                                                            "flex items-center gap-2 p-2 rounded-lg text-xs font-bold border transition-all text-left cursor-pointer",
                                                            isSelected
                                                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-scout-green text-scout-green-dark dark:text-emerald-300"
                                                                : "bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-650 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0",
                                                            isSelected ? "bg-scout-green border-scout-green text-white" : "border-gray-300 dark:border-gray-500"
                                                        )}>
                                                            {isSelected && <Check size={10} />}
                                                        </div>
                                                        <span className="truncate">{region}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Provincia
                                            </h3>
                                            {draftProvinces.length > 0 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setDraftProvinces([])} 
                                                    className="text-xs text-red-500 hover:underline font-bold cursor-pointer"
                                                >
                                                    Resetta ({draftProvinces.length})
                                                </button>
                                            )}
                                        </div>

                                        {/* Ricerca Provincia */}
                                        <div className="relative mb-2">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder={draftRegions.length > 0 ? "Filtra province selezionate..." : "Cerca provincia (es. Bari, Roma)..."}
                                                value={draftProvinceSearch}
                                                onChange={(e) => setDraftProvinceSearch(e.target.value)}
                                                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-650 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-scout-green"
                                            />
                                            {draftProvinceSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDraftProvinceSearch('')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto p-1 border border-gray-150 dark:border-gray-700/60 rounded-xl bg-gray-50/50 dark:bg-gray-800/40">
                                            {filteredDraftProvinces.map(prov => {
                                                const isSelected = draftProvinces.includes(prov);
                                                const code = PROVINCE_TO_CODE[prov];
                                                return (
                                                    <button
                                                        key={prov}
                                                        type="button"
                                                        onClick={() => {
                                                            if (draftProvinces.includes(prov)) {
                                                                setDraftProvinces(draftProvinces.filter(p => p !== prov));
                                                            } else {
                                                                setDraftProvinces([...draftProvinces, prov]);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-1.5 p-2 rounded-lg text-xs font-bold border transition-all text-left cursor-pointer",
                                                            isSelected
                                                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-scout-green text-scout-green-dark dark:text-emerald-300"
                                                                : "bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-650 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0",
                                                            isSelected ? "bg-scout-green border-scout-green text-white" : "border-gray-300 dark:border-gray-500"
                                                        )}>
                                                            {isSelected && <Check size={10} />}
                                                        </div>
                                                        <span className="truncate">{prov} {code && `(${code})`}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: PARTECIPANTI & SISTEMAZIONE */}
                            {filterModalTab === 'needs' && (
                                <div className="space-y-4">
                                    {/* Numero Partecipanti */}
                                    <div className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                Numero partecipanti stimati:
                                            </span>
                                            {draftParticipants !== null && draftParticipants > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDraftParticipants(null)}
                                                    className="text-[11px] text-red-500 font-bold hover:underline"
                                                >
                                                    Azzera
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={0}
                                                max={500}
                                                placeholder="Es. 30 ragazzi"
                                                value={draftParticipants ?? ''}
                                                onChange={e => {
                                                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                                    setDraftParticipants(val && val > 0 ? val : null);
                                                }}
                                                className="w-full h-10 px-3 rounded-xl bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-650 text-xs font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-scout-green"
                                            />
                                        </div>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                                            Valuta le strutture che dichiarano capienza adeguata in letti, accantonamento o spazio tende.
                                        </p>
                                    </div>

                                    {/* Modalità Sistemazione */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Modalità di Pernottamento
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {/* Spazio Tende */}
                                            <button
                                                type="button"
                                                onClick={() => setDraftHasTents(!draftHasTents)}
                                                className={cn(
                                                    "p-3 rounded-xl border text-left transition-all cursor-pointer",
                                                    draftHasTents
                                                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-scout-green text-scout-green-dark dark:text-emerald-300 font-bold"
                                                        : "bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-650 text-gray-700 dark:text-gray-300"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-xs font-bold">
                                                        <Tent size={14} className="text-emerald-600 dark:text-emerald-400" />
                                                        Spazio Tende
                                                    </span>
                                                    {draftHasTents && <Check size={14} className="text-scout-green" />}
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 font-normal leading-tight">
                                                    Spazio tende indicato; capienza effettiva da confermare con il gestore.
                                                </p>
                                            </button>

                                            {/* Posti Letto */}
                                            <button
                                                type="button"
                                                onClick={() => setDraftHasBeds(!draftHasBeds)}
                                                className={cn(
                                                    "p-3 rounded-xl border text-left transition-all cursor-pointer",
                                                    draftHasBeds
                                                        ? "bg-blue-50 dark:bg-blue-950/40 border-scout-blue text-scout-blue font-bold"
                                                        : "bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-650 text-gray-700 dark:text-gray-300"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-xs font-bold">
                                                        <BedDouble size={14} className="text-scout-blue" />
                                                        Posti Letto (Brandine)
                                                    </span>
                                                    {draftHasBeds && <Check size={14} className="text-scout-blue" />}
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 font-normal leading-tight">
                                                    Letti forniti con materasso.
                                                </p>
                                            </button>

                                            {/* Accantonamento a Terra */}
                                            <button
                                                type="button"
                                                onClick={() => setDraftHasAccantonamento(!draftHasAccantonamento)}
                                                className={cn(
                                                    "p-3 rounded-xl border text-left transition-all cursor-pointer col-span-1 sm:col-span-2",
                                                    draftHasAccantonamento
                                                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-600 text-amber-800 dark:text-amber-300 font-bold"
                                                        : "bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-650 text-gray-700 dark:text-gray-300"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-xs font-bold">
                                                        <HomeIcon size={14} className="text-amber-600" />
                                                        Accantonamento a Terra (Stuoino e sacco a pelo)
                                                    </span>
                                                    {draftHasAccantonamento && <Check size={14} className="text-amber-600" />}
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 font-normal leading-tight">
                                                    Spazi al coperto per dormire su stuoino.
                                                </p>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: SERVIZI NECESSARI */}
                            {filterModalTab === 'services' && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                        Dotazioni e Servizi della Struttura
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {[
                                            { label: 'Cucina attrezzata', val: draftHasEquippedKitchen, setter: setDraftHasEquippedKitchen, icon: Utensils },
                                            { label: 'Spazio verde / Prato', val: draftHasGreenSpace, setter: setDraftHasGreenSpace, icon: Trees },
                                            { label: 'Punti d\'acqua potabile', val: draftHasWaterPoints, setter: setDraftHasWaterPoints, icon: Droplets },
                                            { label: 'Riscaldamento', val: draftHasHeating, setter: setDraftHasHeating, icon: Flame },
                                            { label: 'Accesso disabili', val: draftHasDisabledAccess, setter: setDraftHasDisabledAccess, icon: Accessibility },
                                            { label: 'Pali da costruzione', val: draftHasPoles, setter: setDraftHasPoles, icon: ShieldCheck },
                                        ].map(serv => (
                                            <button
                                                key={serv.label}
                                                type="button"
                                                onClick={() => serv.setter(!serv.val)}
                                                className={cn(
                                                    "p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer text-left",
                                                    serv.val
                                                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-scout-green text-scout-green-dark dark:text-emerald-300"
                                                        : "bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-650 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                                                )}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <serv.icon size={15} className="shrink-0" />
                                                    <span>{serv.label}</span>
                                                </span>
                                                {serv.val && <Check size={14} className="text-scout-green shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: BRANCHE & ATTIVITÀ */}
                            {filterModalTab === 'activities' && (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                            Branca Consigliata
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.keys(BRANCH_ACTIVITIES).map(branch => {
                                                const isSel = draftBranches.includes(branch);
                                                return (
                                                    <button
                                                        key={branch}
                                                        type="button"
                                                        onClick={() => {
                                                            setDraftBranches(isSel ? draftBranches.filter(b => b !== branch) : [...draftBranches, branch]);
                                                        }}
                                                        className={cn(
                                                            "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer",
                                                            isSel
                                                                ? "bg-scout-green text-white border-scout-green shadow-xs"
                                                                : "bg-white dark:bg-gray-750 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-650 hover:bg-gray-50"
                                                        )}
                                                    >
                                                        {branch}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                            Attività Specifiche
                                        </h3>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Array.from(new Set(Object.values(BRANCH_ACTIVITIES).flat())).sort().map(activity => {
                                                const isSel = draftActivities.includes(activity);
                                                return (
                                                    <button
                                                        key={activity}
                                                        type="button"
                                                        onClick={() => {
                                                            setDraftActivities(isSel ? draftActivities.filter(a => a !== activity) : [...draftActivities, activity]);
                                                        }}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                                                            isSel
                                                                ? "bg-scout-blue text-white border-scout-blue"
                                                                : "bg-white dark:bg-gray-750 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-650 hover:border-scout-blue/40"
                                                        )}
                                                    >
                                                        {activity}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 5: STATO AGGIORNAMENTO DATI */}
                            {filterModalTab === 'staleness' && (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                        Datazione e Freschezza delle Informazioni
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {STALENESS_LEVELS.map(s => {
                                            const isSel = draftStaleness.includes(s.level);
                                            return (
                                                <button
                                                    key={s.level}
                                                    type="button"
                                                    onClick={() => {
                                                        setDraftStaleness(isSel ? draftStaleness.filter(x => x !== s.level) : [...draftStaleness, s.level]);
                                                    }}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                                        isSel
                                                            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-xs"
                                                            : "bg-white dark:bg-gray-750 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-650 hover:border-gray-300"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", s.color)} />
                                                        <span>{s.label}</span>
                                                    </div>
                                                    {isSel && <Check size={14} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[11px] text-gray-400 leading-tight pt-1">
                                        Filtra i luoghi in base alla data dell'ultima modifica registrata da un capo della community.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer del Modale con Pulsante di Applicazione Dinamico */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-150 dark:border-gray-750 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={resetDraftFilters}
                                className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer px-2 py-1"
                            >
                                Azzera bozza
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowFiltersModal(false)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-650 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-750 transition-all cursor-pointer"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="button"
                                    onClick={applyDraftFilters}
                                    className="px-5 py-2.5 rounded-xl bg-scout-green hover:bg-scout-green-dark text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    Mostra {draftMatchesCount} {draftMatchesCount === 1 ? 'luogo' : 'luoghi'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
