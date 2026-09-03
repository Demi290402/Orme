import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

interface LocationMapPickerProps {
    latitude: string;
    longitude: string;
    commune?: string;
    province?: string;
    region?: string;
    onChange: (lat: number, lng: number) => void;
}

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

// Icona personalizzata scout per il pin di posizionamento
const pickerIcon = L.divIcon({
    html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full cursor-grab active:cursor-grabbing">
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-scout-green text-white shadow-xl border-3 border-white dark:border-gray-800 text-lg select-none hover:scale-110 transition-transform">
                🏕️
            </div>
            <div class="absolute -bottom-1 w-2.5 h-2.5 bg-scout-green-dark rotate-45 border-r border-b border-white"></div>
        </div>
    `,
    className: 'custom-picker-pin',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
});

export default function LocationMapPicker({
    latitude,
    longitude,
    commune,
    onChange,
}: LocationMapPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);

    const numLat = parseFloat(latitude);
    const numLng = parseFloat(longitude);
    const hasValidCoords = !isNaN(numLat) && !isNaN(numLng) && numLat !== 0 && numLng !== 0;

    // Inizializzazione della mappa
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const defaultCenter: [number, number] = hasValidCoords ? [numLat, numLng] : [42.5, 12.5];
        const defaultZoom = hasValidCoords ? 15 : 6;

        const map = L.map(containerRef.current, {
            center: defaultCenter,
            zoom: defaultZoom,
            zoomControl: true,
        });

        L.tileLayer(OSM_TILE_URL, {
            attribution: OSM_ATTRIBUTION,
            maxZoom: 19,
        }).addTo(map);

        // Click sulla mappa per posizionare / spostare il pin
        map.on('click', (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;
            onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
    }, []);

    // Aggiornamento marker quando cambiano le coordinate
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (hasValidCoords) {
            const latLng: [number, number] = [numLat, numLng];

            if (!markerRef.current) {
                const marker = L.marker(latLng, {
                    icon: pickerIcon,
                    draggable: true,
                }).addTo(map);

                marker.on('dragend', () => {
                    const pos = marker.getLatLng();
                    onChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
                });

                markerRef.current = marker;
            } else {
                markerRef.current.setLatLng(latLng);
            }

            map.setView(latLng, Math.max(map.getZoom(), 14), { animate: true });
        } else if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }
    }, [numLat, numLng, hasValidCoords]);

    // Centra sulla posizione attuale dell'utente via GPS
    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('La geolocalizzazione non è supportata dal tuo browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = Number(pos.coords.latitude.toFixed(6));
                const lng = Number(pos.coords.longitude.toFixed(6));
                onChange(lat, lng);
            },
            (err) => {
                console.warn('Errore GPS:', err);
                alert('Impossibile ottenere la posizione GPS attuale.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <div className="space-y-2 mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span className="font-semibold flex items-center gap-1.5 text-scout-green">
                    <MapPin size={14} /> Clicca sulla mappa o trascina il pin per posizionare il punto esatto
                </span>
                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-[11px] font-bold text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
                >
                    <Navigation size={12} className="text-scout-blue" />
                    Usa mia posizione GPS
                </button>
            </div>

            <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm z-0">
                <div ref={containerRef} className="w-full h-full" />

                {/* Badge informativo flottante */}
                <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow border border-gray-200/80 dark:border-gray-700 text-[11px] font-bold text-gray-800 dark:text-gray-200 pointer-events-none flex items-center gap-1.5">
                    {hasValidCoords ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span>Punto posizionato: {numLat.toFixed(5)}, {numLng.toFixed(5)}</span>
                        </>
                    ) : (
                        <>
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Nessun punto selezionato: fai clic sulla mappa</span>
                        </>
                    )}
                </div>

                {commune && !hasValidCoords && (
                    <div className="absolute bottom-2.5 left-2.5 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xs px-3 py-1 rounded-lg text-[10px] font-semibold text-gray-600 dark:text-gray-300 pointer-events-none">
                        Comune di riferimento: {commune}
                    </div>
                )}
            </div>
        </div>
    );
}
