import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
if (typeof window !== 'undefined') {
    (window as any).L = L;
}
import 'leaflet.markercluster';

import { Location } from '@/types';
import { extractCoordsFromMapsUrl, resolveLocationCoordinates } from '@/lib/geo';
import { MapPin, ChevronRight, Info } from 'lucide-react';

interface InteractiveMapProps {
    locations: Location[];
}

interface MappedLocation {
    location: Location;
    coords: { lat: number; lng: number };
    isEstimated: boolean;
}

// Configurazione tile layer OpenStreetMap (100% gratuito, nessuna API key richiesta)
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

// Crea l'icona personalizzata per il marker
function createLocationIcon(loc: Location): L.DivIcon {
    let bg = 'bg-scout-blue';
    let emoji = '⚜️';
    if (loc.hasTents) {
        bg = 'bg-scout-green';
        emoji = '🏕️';
    } else if (loc.beds && loc.beds > 0) {
        bg = 'bg-red-500';
        emoji = '🏠';
    }

    return L.divIcon({
        html: `<div class="flex items-center justify-center w-9 h-9 rounded-full ${bg} border-2 border-white shadow-lg text-base leading-none select-none">${emoji}</div>`,
        className: 'custom-location-pin',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
    });
}

// Crea l'HTML del popup per un dato luogo
function buildPopupHtml(item: MappedLocation): string {
    const loc = item.location;
    const rating = Number(loc.avgRating) || 0;
    const ratingText = rating > 0 ? rating.toFixed(1) : '—';
    const ormeLabel = loc.reviewsCount === 1 ? 'orma' : 'orme';

    let badgesHtml = '';
    if (loc.hasTents) {
        badgesHtml += `<span class="inline-flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-green-200 dark:border-emerald-800">🏕️ Tende</span>`;
    }
    if (loc.beds && loc.beds > 0) {
        badgesHtml += `<span class="inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800">🏠 ${loc.beds} letti</span>`;
    }
    if (loc.hasDisabledAccess) {
        badgesHtml += `<span class="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">♿ Disabili</span>`;
    }

    const estimatedNotice = item.isEstimated ? `
        <div class="mb-2 p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-800 dark:text-amber-300 leading-tight flex items-center gap-1">
            <span>⚠️</span>
            <span>Posizione approssimata da indirizzo</span>
        </div>
    ` : '';

    return `
        <div class="p-2 font-sans w-56 text-gray-900 dark:text-gray-100">
            <h4 class="font-black text-sm text-gray-900 dark:text-white mb-0.5 leading-tight">${loc.name}</h4>
            <p class="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2">${loc.commune}, ${loc.region}</p>
            
            ${estimatedNotice}

            <div class="flex items-center gap-1.5 mb-2.5">
                <span class="text-yellow-500 font-bold text-xs">⭐ ${ratingText}</span>
                <span class="text-[10px] text-gray-400 font-semibold">(${loc.reviewsCount} ${ormeLabel})</span>
            </div>

            ${badgesHtml ? `<div class="flex flex-wrap gap-1.5 mb-3">${badgesHtml}</div>` : ''}

            <button
                type="button"
                data-open-location="${loc.id}"
                class="w-full text-center bg-scout-green hover:bg-scout-green-dark active:scale-[0.98] text-white text-xs font-bold py-2 rounded-xl shadow transition-all cursor-pointer select-none"
            >
                Apri Scheda
            </button>
        </div>
    `;
}

export default function InteractiveMap({ locations }: InteractiveMapProps) {
    const navigate = useNavigate();

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const clusterGroupRef = useRef<any>(null);
    const markersMapRef = useRef<Record<string, L.Marker>>({});

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mappedList, setMappedList] = useState<MappedLocation[]>([]);
    const [unmappedList, setUnmappedList] = useState<Location[]>([]);

    // Risolve le posizioni sia in modo sincrono che asincrono (da link Maps o indirizzo)
    useEffect(() => {
        let isCurrent = true;

        const initialMapped: MappedLocation[] = [];
        const toGeocode: Location[] = [];

        for (const loc of locations) {
            const lat = loc.coordinates?.lat;
            const lng = loc.coordinates?.lng;
            if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
                initialMapped.push({
                    location: loc,
                    coords: { lat: Number(lat), lng: Number(lng) },
                    isEstimated: false,
                });
            } else if (loc.googleMapsLink) {
                const extracted = extractCoordsFromMapsUrl(loc.googleMapsLink);
                if (extracted) {
                    initialMapped.push({
                        location: loc,
                        coords: extracted,
                        isEstimated: false,
                    });
                } else {
                    toGeocode.push(loc);
                }
            } else {
                toGeocode.push(loc);
            }
        }

        setMappedList(initialMapped);

        // Risoluzione in background per i luoghi senza coordinate dirette
        if (toGeocode.length > 0) {
            (async () => {
                const asyncResolved: MappedLocation[] = [];
                const remainingUnmapped: Location[] = [];

                for (const loc of toGeocode) {
                    if (!isCurrent) return;
                    const res = await resolveLocationCoordinates(loc);
                    if (res) {
                        asyncResolved.push({
                            location: loc,
                            coords: res.coords,
                            isEstimated: res.isEstimated,
                        });
                    } else {
                        remainingUnmapped.push(loc);
                    }
                }

                if (isCurrent) {
                    setMappedList((prev) => {
                        const existingIds = new Set(prev.map((p) => p.location.id));
                        const newItems = asyncResolved.filter((item) => !existingIds.has(item.location.id));
                        return [...prev, ...newItems];
                    });
                    setUnmappedList(remainingUnmapped);
                }
            })();
        } else {
            setUnmappedList([]);
        }

        return () => {
            isCurrent = false;
        };
    }, [locations]);

    // 1. Inizializzazione della mappa Leaflet
    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Se la mappa esiste già, non ricrearla
        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [42.0, 12.5],
                zoom: 6,
                zoomControl: true,
            });

            const tileLayer = L.tileLayer(OSM_TILE_URL, {
                attribution: OSM_ATTRIBUTION,
                maxZoom: 19,
            }).addTo(map);

            tileLayerRef.current = tileLayer;

            const clusterGroup = (L as any).markerClusterGroup({
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                iconCreateFunction: (cluster: any) => {
                    const count = cluster.getChildCount();
                    return L.divIcon({
                        html: `<div class="flex items-center justify-center w-10 h-10 rounded-full bg-scout-green text-white border-4 border-white dark:border-gray-800 shadow-xl font-black text-xs select-none">${count}</div>`,
                        className: 'custom-marker-cluster',
                        iconSize: [40, 40],
                    });
                },
            });

            clusterGroup.addTo(map);
            clusterGroupRef.current = clusterGroup;
            mapInstanceRef.current = map;
        }

        // Cleanup al dismount
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                tileLayerRef.current = null;
                clusterGroupRef.current = null;
                markersMapRef.current = {};
            }
        };
    }, []);

    // 2. Aggiorna marker sulla mappa quando mappedList cambia
    useEffect(() => {
        const map = mapInstanceRef.current;
        const clusterGroup = clusterGroupRef.current;
        if (!map || !clusterGroup) return;

        clusterGroup.clearLayers();
        markersMapRef.current = {};

        const latLngs: L.LatLng[] = [];

        mappedList.forEach((item) => {
            const lat = item.coords.lat;
            const lng = item.coords.lng;
            const latLng = L.latLng(lat, lng);
            latLngs.push(latLng);

            const icon = createLocationIcon(item.location);
            const marker = L.marker(latLng, { icon });
            marker.bindPopup(buildPopupHtml(item), {
                maxWidth: 260,
                className: 'custom-leaflet-popup',
            });

            marker.on('click', () => {
                setSelectedId(item.location.id);
            });

            markersMapRef.current[item.location.id] = marker;
            clusterGroup.addLayer(marker);
        });

        // Adatta la visuale ai marker presenti
        if (latLngs.length === 1) {
            map.setView(latLngs[0], 12);
        } else if (latLngs.length > 1) {
            map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
        }
    }, [mappedList]);

    // 3. Gestione click su bottoni all'interno dei popup HTML
    useEffect(() => {
        const container = mapContainerRef.current;
        if (!container) return;

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const btn = target.closest('[data-open-location]');
            if (btn) {
                const locId = btn.getAttribute('data-open-location');
                if (locId) {
                    navigate(`/location/${locId}`);
                }
            }
        };

        container.addEventListener('click', handleClick);
        return () => {
            container.removeEventListener('click', handleClick);
        };
    }, [navigate]);

    // 4. Clicca su un luogo dalla lista laterale
    const handleListItemClick = useCallback((item: MappedLocation) => {
        setSelectedId(item.location.id);
        const map = mapInstanceRef.current;
        const marker = markersMapRef.current[item.location.id];
        const clusterGroup = clusterGroupRef.current;

        if (map && marker && clusterGroup) {
            const lat = item.coords.lat;
            const lng = item.coords.lng;
            const latLng = L.latLng(lat, lng);

            clusterGroup.zoomToShowLayer(marker, () => {
                map.setView(latLng, Math.max(map.getZoom(), 13), { animate: true });
                marker.openPopup();
            });
        }
    }, []);

    const estimatedCount = mappedList.filter((m) => m.isEstimated).length;

    return (
        <div className="relative w-full font-sans flex flex-col gap-3">
            {/* Banner informativo precisione coordinate */}
            <div className="flex items-start gap-2.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                <Info size={17} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                    <strong className="font-bold">Precisione coordinate:</strong> Orme posiziona i luoghi sulla mappa in modo autonomo ricavando la posizione da link Maps o indirizzo. Per una collocazione geografica ottimale e precisa, è fortemente consigliato inserire o verificare le coordinate esatte nella scheda di ogni luogo.
                    {unmappedList.length > 0 && (
                        <p className="mt-1 font-semibold text-red-700 dark:text-red-400">
                            {unmappedList.length} {unmappedList.length === 1 ? 'luogo non è stato posizionato' : 'luoghi non sono stati posizionati'} per mancanza di indirizzo/link Maps ({unmappedList.map((l) => l.name).join(', ')}).
                        </p>
                    )}
                </div>
            </div>

            <div className="flex gap-3">
                {/* Mappa principale */}
                <div className="flex-1 min-w-0">
                    <div
                        id="scout-interactive-map"
                        ref={mapContainerRef}
                        className="w-full h-[65vh] md:h-[70vh] rounded-3xl overflow-hidden shadow-sm border border-gray-150 dark:border-gray-700 z-10"
                    />
                </div>

                {/* Lista laterale — solo desktop */}
                {mappedList.length > 0 && (
                    <div className="hidden md:flex flex-col w-64 shrink-0 h-[70vh] bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
                            <h3 className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                <MapPin size={14} className="text-scout-green" />
                                Luoghi sulla mappa
                            </h3>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">
                                {mappedList.length} {mappedList.length === 1 ? 'luogo visualizzato' : 'luoghi visualizzati'}
                                {estimatedCount > 0 && ` (${estimatedCount} stimati)`}
                            </p>
                        </div>
                        <ul className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
                            {mappedList.map((item) => {
                                const loc = item.location;
                                const isSelected = selectedId === loc.id;
                                return (
                                    <li key={loc.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleListItemClick(item)}
                                            className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-2 group cursor-pointer ${
                                                isSelected
                                                    ? 'bg-scout-green/10 dark:bg-emerald-950/30'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                            }`}
                                        >
                                            <div className="shrink-0 text-base leading-none">
                                                {loc.hasTents ? '🏕️' : loc.beds && loc.beds > 0 ? '🏠' : '⚜️'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className={`text-xs font-bold truncate ${
                                                        isSelected
                                                            ? 'text-scout-green-dark dark:text-emerald-400'
                                                            : 'text-gray-900 dark:text-white'
                                                    }`}
                                                >
                                                    {loc.name}
                                                </p>
                                                <p className="text-[9px] text-gray-400 font-semibold truncate uppercase tracking-wider">
                                                    {loc.commune}, {loc.region}
                                                </p>
                                                {item.isEstimated && (
                                                    <span className="text-[8px] font-bold text-amber-700 dark:text-amber-400">
                                                        ⚠️ Posizione stimata
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronRight
                                                size={12}
                                                className={`shrink-0 transition-colors ${
                                                    isSelected
                                                        ? 'text-scout-green'
                                                        : 'text-gray-300 dark:text-gray-600 group-hover:text-gray-400'
                                                }`}
                                            />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>

            {/* Badge flottante in basso */}
            <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 px-5 py-2 rounded-full shadow-lg border border-gray-100 dark:border-gray-700">
                    <span className="w-2 h-2 bg-scout-green rounded-full animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        {mappedList.length} / {locations.length} luoghi sulla mappa
                    </span>
                </div>
            </div>
        </div>
    );
}
