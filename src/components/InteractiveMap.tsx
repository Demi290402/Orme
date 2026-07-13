import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { Location } from '@/types';
import { Footprints } from 'lucide-react';

interface InteractiveMapProps {
    locations: Location[];
}

const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.body.appendChild(script);
    });
};

const loadStyle = (href: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`link[href="${href}"]`)) {
            resolve();
            return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => reject();
        document.head.appendChild(link);
    });
};

export default function InteractiveMap({ locations }: InteractiveMapProps) {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMapInstanceRef = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);
    const markerClusterGroupRef = useRef<any>(null);
    const [libLoaded, setLibLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);

    // 1. Dynamic load Leaflet and MarkerCluster CDNs
    useEffect(() => {
        Promise.all([
            loadStyle('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),
            loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')
        ])
            .then(() => {
                return Promise.all([
                    loadStyle('https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css'),
                    loadStyle('https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css'),
                    loadScript('https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js')
                ]);
            })
            .then(() => {
                setLibLoaded(true);
            })
            .catch((err) => {
                console.error("Failed to load Leaflet libraries:", err);
                setLoadError(true);
            });
    }, []);

    // 2. Capture dynamically created popup links and route using React Router
    useEffect(() => {
        const mapEl = mapRef.current;
        if (!mapEl) return;

        const handleLinkClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (link) {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/location/')) {
                    e.preventDefault();
                    navigate(href);
                }
            }
        };

        mapEl.addEventListener('click', handleLinkClick);
        return () => {
            mapEl.removeEventListener('click', handleLinkClick);
        };
    }, [navigate]);

    // 3. Initialize Map and manage tile layers & markers
    useEffect(() => {
        if (!libLoaded || !mapRef.current) return;
        const L = (window as any).L;
        if (!L) return;

        // Create map if it doesn't exist
        if (!leafletMapInstanceRef.current) {
            const map = L.map(mapRef.current, {
                center: [42.0, 12.5], // Center of Italy
                zoom: 6,
                zoomControl: true
            });
            leafletMapInstanceRef.current = map;
        }

        const map = leafletMapInstanceRef.current;

        // Update Tile Layer based on theme (Voyager for Light, Dark Matter for Dark)
        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
        }

        const tileUrl = theme === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        const tileAttribution = theme === 'dark'
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

        tileLayerRef.current = L.tileLayer(tileUrl, {
            attribution: tileAttribution,
            maxZoom: 19
        }).addTo(map);

        // Update Markers
        if (markerClusterGroupRef.current) {
            map.removeLayer(markerClusterGroupRef.current);
        }

        const markers = L.markerClusterGroup({
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: function (cluster: any) {
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: `<div class="flex items-center justify-center w-10 h-10 rounded-full bg-scout-green text-white border-4 border-white dark:border-gray-800 font-black shadow-lg text-xs transition-all">${count}</div>`,
                    className: 'custom-marker-cluster',
                    iconSize: L.point(40, 40)
                });
            }
        });

        console.log("InteractiveMap - rendering markers. Total locations received:", locations.length);
        const validCoordsCount = locations.filter(l => l.coordinates?.lat && l.coordinates?.lng).length;
        console.log("InteractiveMap - locations with valid coordinates:", validCoordsCount);

        // Add pins for locations with valid coordinates
        locations.forEach((loc) => {
            if (loc.coordinates?.lat && loc.coordinates?.lng) {
                // Determine icon HTML based on characteristics
                let iconHtml = '';
                if (loc.hasTents) {
                    iconHtml = `
                        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-scout-green border-2 border-white dark:border-gray-800 shadow-md text-white hover:scale-[1.1] transition-transform">
                            🏕️
                        </div>
                    `;
                } else if (loc.beds && loc.beds > 0) {
                    iconHtml = `
                        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 border-2 border-white dark:border-gray-800 shadow-md text-white hover:scale-[1.1] transition-transform">
                            🏠
                        </div>
                    `;
                } else {
                    iconHtml = `
                        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-scout-blue border-2 border-white dark:border-gray-800 shadow-md text-white hover:scale-[1.1] transition-transform">
                            ⚜️
                        </div>
                    `;
                }

                const customIcon = L.divIcon({
                    html: iconHtml,
                    className: 'custom-location-pin',
                    iconSize: L.point(32, 32),
                    iconAnchor: L.point(16, 16)
                });

                // Popup content card
                const popupContent = `
                    <div class="p-2 font-sans max-w-[240px] text-gray-900 dark:text-white rounded-2xl">
                        <h4 class="font-extrabold text-sm mb-1 text-gray-900 dark:text-gray-100">${loc.name}</h4>
                        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-bold">${loc.commune}, ${loc.region}</p>
                        <div class="flex items-center gap-1.5 mb-3">
                            <span class="text-xs font-black text-scout-green-dark dark:text-emerald-400">${loc.avgRating > 0 ? Number(loc.avgRating).toFixed(1) : '—'} ⭐</span>
                            <span class="text-[9px] text-gray-400 font-semibold uppercase">(${loc.reviewsCount} orme)</span>
                        </div>
                        <div class="flex flex-wrap gap-1 mb-4">
                            ${loc.hasTents ? '<span class="text-[8px] font-bold bg-green-50 dark:bg-emerald-950/20 text-green-700 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-green-100 dark:border-emerald-800">🏕️ Tende</span>' : ''}
                            ${loc.beds ? `<span class="text-[8px] font-bold bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-800">🏠 ${loc.beds} Letti</span>` : ''}
                            ${loc.hasDisabledAccess ? '<span class="text-[8px] font-bold bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800">♿ Disabili</span>' : ''}
                        </div>
                        <a href="/location/${loc.id}" class="block text-center w-full bg-scout-green text-white text-xs font-bold py-2.5 rounded-xl shadow-md hover:bg-scout-green-dark transition-all select-none">
                            Apri Scheda
                        </a>
                    </div>
                `;

                const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], { icon: customIcon })
                    .bindPopup(popupContent, {
                        maxWidth: 250,
                        className: 'custom-leaflet-popup'
                    });

                markers.addLayer(marker);
            }
        });

        markers.addTo(map);
        markerClusterGroupRef.current = markers;

        // Auto zoom-to-bounds of markers if they exist
        const validCoords = locations.filter(l => l.coordinates?.lat && l.coordinates?.lng);
        if (validCoords.length > 0) {
            const bounds = L.latLngBounds(validCoords.map(l => [l.coordinates!.lat, l.coordinates!.lng]));
            map.fitBounds(bounds, { padding: [30, 30] });
        }
    }, [libLoaded, locations, theme]);

    // Clean up map instance on unmount
    useEffect(() => {
        return () => {
            if (leafletMapInstanceRef.current) {
                leafletMapInstanceRef.current.remove();
                leafletMapInstanceRef.current = null;
                tileLayerRef.current = null;
                markerClusterGroupRef.current = null;
            }
        };
    }, []);

    if (loadError) {
        return (
            <div className="w-full h-[65vh] bg-red-50 dark:bg-red-900/20 border border-red-150 dark:border-red-900/40 rounded-3xl flex flex-col items-center justify-center text-center p-6 gap-2">
                <span className="text-3xl">⚠️</span>
                <h4 className="font-bold text-red-800 dark:text-red-300">Errore di caricamento</h4>
                <p className="text-sm text-red-600 dark:text-red-400 max-w-xs">Impossibile scaricare le mappe. Verifica la tua connessione ad Internet.</p>
            </div>
        );
    }

    if (!libLoaded) {
        return (
            <div className="w-full h-[65vh] bg-gray-50 dark:bg-gray-800/50 border border-gray-150 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center text-center p-6 gap-3 animate-pulse">
                <Footprints size={40} className="text-scout-green animate-spin" />
                <h4 className="font-bold text-gray-500 dark:text-gray-400">Caricamento Mappe...</h4>
            </div>
        );
    }

    return (
        <div className="relative w-full font-sans">
            <div
                id="scout-interactive-map"
                ref={mapRef}
                className="w-full h-[65vh] md:h-[70vh] rounded-3xl overflow-hidden shadow-sm relative border border-gray-150 dark:border-gray-700 z-10"
            />
            {/* Pill Floating Badge (Match Screen) */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-white dark:bg-gray-800 px-6 py-2.5 rounded-full shadow-xl border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-scout-green rounded-full animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">Mappa Interattiva</span>
            </div>
        </div>
    );
}
