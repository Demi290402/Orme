import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from '@changey/react-leaflet-markercluster';
import L from 'leaflet';
import { useTheme } from '@/context/ThemeContext';
import { Location } from '@/types';
import { MapPin, AlertTriangle, Tent, BedDouble, Accessibility, Star, ChevronRight } from 'lucide-react';

// Fix per l'icona di default di Leaflet con Vite/Webpack (asset bundling)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

interface InteractiveMapProps {
    locations: Location[];
}

// Determina tile URL e attribution in base al tema
function getTileConfig(theme: string) {
    if (theme === 'dark') {
        return {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        };
    }
    return {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    };
}

// Crea un'icona personalizzata in base al tipo di luogo
function createLocationIcon(loc: Location): L.DivIcon {
    let bg = 'bg-scout-blue';
    let emoji = '⚜️';
    if (loc.hasTents) { bg = 'bg-scout-green'; emoji = '🏕️'; }
    else if (loc.beds && loc.beds > 0) { bg = 'bg-red-500'; emoji = '🏠'; }

    return L.divIcon({
        html: `<div class="flex items-center justify-center w-9 h-9 rounded-full ${bg} border-2 border-white shadow-lg text-base leading-none">${emoji}</div>`,
        className: 'custom-location-pin',
        iconSize: L.point(36, 36),
        iconAnchor: L.point(18, 18),
        popupAnchor: L.point(0, -20),
    });
}

// Sottocomponente per aggiornare il TileLayer quando cambia il tema
function DynamicTileLayer() {
    const { theme } = useTheme();
    const tile = getTileConfig(theme);
    return <TileLayer url={tile.url} attribution={tile.attribution} maxZoom={19} />;
}

// Sottocomponente per adattare la vista ai bounds dei marker
function FitBounds({ positions }: { positions: [number, number][] }) {
    const map = useMap();
    const fitted = useRef(false);
    useEffect(() => {
        if (!fitted.current && positions.length > 0) {
            fitted.current = true;
            if (positions.length === 1) {
                map.setView(positions[0], 13);
            } else {
                map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
            }
        }
    }, [map, positions]);
    return null;
}

export default function InteractiveMap({ locations }: InteractiveMapProps) {
    const navigate = useNavigate();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const markerRefs = useRef<Record<string, L.Marker>>(({}));
    const mapRef = useRef<L.Map | null>(null);

    // Separa i luoghi con coordinate da quelli senza
    const { withCoords, withoutCoords } = useMemo(() => {
        const withCoords: Location[] = [];
        const withoutCoords: Location[] = [];
        for (const loc of locations) {
            const lat = loc.coordinates?.lat;
            const lng = loc.coordinates?.lng;
            if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
                withCoords.push(loc);
            } else {
                withoutCoords.push(loc);
            }
        }
        return { withCoords, withoutCoords };
    }, [locations]);

    const positions = useMemo(
        () => withCoords.map(loc => [Number(loc.coordinates!.lat), Number(loc.coordinates!.lng)] as [number, number]),
        [withCoords]
    );

    // Cluster icon personalizzata
    const clusterIconCreateFunction = (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
            html: `<div class="flex items-center justify-center w-10 h-10 rounded-full bg-scout-green text-white border-4 border-white shadow-xl font-black text-xs">${count}</div>`,
            className: 'custom-marker-cluster',
            iconSize: L.point(40, 40),
        });
    };

    // Centra la mappa e apre il popup sul luogo selezionato dalla lista
    const handleListItemClick = (loc: Location) => {
        setSelectedId(loc.id);
        const marker = markerRefs.current[loc.id];
        const map = mapRef.current;
        if (marker && map) {
            const latlng = marker.getLatLng();
            map.setView(latlng, Math.max(map.getZoom(), 13), { animate: true });
            setTimeout(() => marker.openPopup(), 350);
        }
    };

    return (
        <div className="relative w-full font-sans flex flex-col gap-3">
            {/* Avviso luoghi senza coordinate */}
            {withoutCoords.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
                    <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold leading-relaxed">
                        {withoutCoords.length} {withoutCoords.length === 1 ? 'luogo non ha' : 'luoghi non hanno'} coordinate salvate e {withoutCoords.length === 1 ? 'non viene visualizzato' : 'non vengono visualizzati'} sulla mappa:{' '}
                        <span className="font-bold">{withoutCoords.map(l => l.name).join(', ')}</span>.
                    </p>
                </div>
            )}

            <div className="flex gap-3">
                {/* Mappa principale */}
                <div className="flex-1 min-w-0">
                    <MapContainer
                        center={[42.0, 12.5]}
                        zoom={6}
                        className="w-full h-[65vh] md:h-[70vh] rounded-3xl overflow-hidden shadow-sm border border-gray-150 dark:border-gray-700 z-10"
                        zoomControl={true}
                        ref={mapRef}
                        // theme-key forzato per evitare problemi di re-mount
                        key="scout-map"
                    >
                        <DynamicTileLayer />
                        <FitBounds positions={positions} />

                        <MarkerClusterGroup
                            showCoverageOnHover={false}
                            zoomToBoundsOnClick={true}
                            iconCreateFunction={clusterIconCreateFunction}
                        >
                            {withCoords.map((loc) => {
                                const lat = Number(loc.coordinates!.lat);
                                const lng = Number(loc.coordinates!.lng);
                                const rating = Number(loc.avgRating);
                                return (
                                    <Marker
                                        key={loc.id}
                                        position={[lat, lng]}
                                        icon={createLocationIcon(loc)}
                                        ref={(ref) => {
                                            if (ref) markerRefs.current[loc.id] = ref;
                                        }}
                                        eventHandlers={{
                                            click: () => setSelectedId(loc.id),
                                        }}
                                    >
                                        <Popup
                                            maxWidth={256}
                                            className="custom-leaflet-popup"
                                        >
                                            <div className="p-1 font-sans w-56">
                                                {/* Header */}
                                                <h4 className="font-extrabold text-sm text-gray-900 mb-0.5 leading-tight">
                                                    {loc.name}
                                                </h4>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2">
                                                    {loc.commune}, {loc.region}
                                                </p>

                                                {/* Rating */}
                                                <div className="flex items-center gap-1 mb-2">
                                                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                                                    <span className="text-xs font-black text-gray-800">
                                                        {rating > 0 ? rating.toFixed(1) : '—'}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 font-semibold">
                                                        ({loc.reviewsCount} {loc.reviewsCount === 1 ? 'orma' : 'orme'})
                                                    </span>
                                                </div>

                                                {/* Badge caratteristiche */}
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {loc.hasTents && (
                                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                                                            <Tent size={9} /> Tende
                                                        </span>
                                                    )}
                                                    {loc.beds && loc.beds > 0 ? (
                                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100">
                                                            <BedDouble size={9} /> {loc.beds} letti
                                                        </span>
                                                    ) : null}
                                                    {loc.hasDisabledAccess && (
                                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">
                                                            <Accessibility size={9} /> Disabili
                                                        </span>
                                                    )}
                                                </div>

                                                {/* CTA */}
                                                <button
                                                    onClick={() => navigate(`/location/${loc.id}`)}
                                                    className="block w-full text-center bg-scout-green hover:bg-scout-green-dark text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                                                >
                                                    Apri Scheda
                                                </button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MarkerClusterGroup>
                    </MapContainer>
                </div>

                {/* Lista laterale — solo desktop */}
                {withCoords.length > 0 && (
                    <div className="hidden md:flex flex-col w-64 shrink-0 h-[70vh] bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
                            <h3 className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                <MapPin size={14} className="text-scout-green" />
                                Luoghi sulla mappa
                            </h3>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">
                                {withCoords.length} {withCoords.length === 1 ? 'luogo' : 'luoghi'} visualizzati
                            </p>
                        </div>
                        <ul className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
                            {withCoords.map((loc) => {
                                const isSelected = selectedId === loc.id;
                                return (
                                    <li key={loc.id}>
                                        <button
                                            onClick={() => handleListItemClick(loc)}
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
                                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-scout-green-dark dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                                                    {loc.name}
                                                </p>
                                                <p className="text-[9px] text-gray-400 font-semibold truncate uppercase tracking-wider">
                                                    {loc.commune}, {loc.region}
                                                </p>
                                            </div>
                                            <ChevronRight
                                                size={12}
                                                className={`shrink-0 transition-colors ${isSelected ? 'text-scout-green' : 'text-gray-300 dark:text-gray-600 group-hover:text-gray-400'}`}
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
                        {withCoords.length} / {locations.length} luoghi sulla mappa
                    </span>
                </div>
            </div>
        </div>
    );
}
