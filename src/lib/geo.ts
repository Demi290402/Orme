// Helper per estrazione coordinate e geocoding autonomo

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface GeocodeResult {
    coords: Coordinates;
    placeRank: number;
    addresstype: string;
    type: string;
    displayName: string;
    isTownCenter: boolean;
}

export interface ResolutionResult {
    coords: Coordinates;
    isEstimated: boolean;
    isTownCenter: boolean;
    source: 'direct' | 'maps_url' | 'poi_name' | 'address' | 'commune_fallback';
    message: string;
}

const GEO_CACHE_KEY = 'orme_geocode_cache_v2';

// Legge la cache locale del geocoding per non ripetere richieste
function getGeocodeCache(): Record<string, GeocodeResult> {
    try {
        const cached = localStorage.getItem(GEO_CACHE_KEY);
        if (cached) return JSON.parse(cached);
    } catch {
        // ignore
    }
    return {};
}

// Salva in cache
function saveToGeocodeCache(query: string, result: GeocodeResult) {
    try {
        const cache = getGeocodeCache();
        cache[query.trim().toLowerCase()] = result;
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
    } catch {
        // ignore
    }
}

/**
 * Controlla se il link è un link breve (es. maps.app.goo.gl o goo.gl/maps)
 */
export function isShortMapsUrl(url?: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return lower.includes('maps.app.goo.gl') || lower.includes('goo.gl/maps');
}

/**
 * Estrae le coordinate da qualsiasi formato di URL o stringa coordinate Google Maps
 */
export function extractCoordsFromMapsUrl(url?: string): Coordinates | null {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    try {
        const decoded = decodeURIComponent(trimmed);

        // 1. Coppia numerica grezza inserita direttamente (es. "44.831118, 9.598681" o "44.831118 9.598681")
        const mraw = decoded.match(/^(-?\d{1,2}\.\d{3,})[\s,;]+(-?\d{1,3}\.\d{3,})$/);
        if (mraw) {
            const lat = parseFloat(mraw[1]);
            const lng = parseFloat(mraw[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // 2. Formato !3dlat!4dlng (comune nei link google.com/maps/place/...)
        const m3d = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (m3d) {
            const lat = parseFloat(m3d[1]);
            const lng = parseFloat(m3d[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // 3. Formato @lat,lng,zoom (es. /@41.123456,16.54321,15z)
        const mat = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (mat) {
            const lat = parseFloat(mat[1]);
            const lng = parseFloat(mat[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // 4. Parametri di query: q=lat,lng o ll=lat,lng o query=lat,lng o daddr=lat,lng o saddr=lat,lng
        const mq = decoded.match(/[?&](?:q|ll|query|daddr|saddr)=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (mq) {
            const lat = parseFloat(mq[1]);
            const lng = parseFloat(mq[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // 5. Formato loc:lat+lng o loc:lat,lng
        const mloc = decoded.match(/loc:(-?\d+\.\d+)[+,](-?\d+\.\d+)/);
        if (mloc) {
            const lat = parseFloat(mloc[1]);
            const lng = parseFloat(mloc[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // 6. Formato all'interno di query string o path "/place/44.831118,9.598681"
        const mplace = decoded.match(/\/place\/(-?\d{1,2}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/);
        if (mplace) {
            const lat = parseFloat(mplace[1]);
            const lng = parseFloat(mplace[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // 7. Qualsiasi coppia di numeri decimali a 4+ decimali
        const mplain = decoded.match(/(-?\d{1,2}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/);
        if (mplain) {
            const lat = parseFloat(mplain[1]);
            const lng = parseFloat(mplain[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }
    } catch (e) {
        console.warn('Errore parsing coordinate da Google Maps:', e);
    }

    return null;
}

/**
 * Geocodifica una query tramite OpenStreetMap Nominatim con dettagli sul tipo di luogo trovato
 */
export async function geocodeDetailed(query: string): Promise<GeocodeResult | null> {
    if (!query || query.trim().length < 3) return null;
    const cleanQuery = query.trim().toLowerCase();

    // Controlla cache locale
    const cache = getGeocodeCache();
    if (cache[cleanQuery]) {
        return cache[cleanQuery];
    }

    try {
        const encoded = encodeURIComponent(query.trim());
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1&countrycodes=it`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const item = data[0];
                const lat = parseFloat(item.lat);
                const lng = parseFloat(item.lon);
                if (!isNaN(lat) && !isNaN(lng)) {
                    const placeRank = item.place_rank ?? 0;
                    const addresstype = item.addresstype || '';
                    const type = item.type || '';
                    const isTownCenter = placeRank < 20 ||
                        ['administrative', 'city', 'town', 'village', 'municipality'].includes(addresstype) ||
                        ['boundary'].includes(item.class);

                    const result: GeocodeResult = {
                        coords: { lat, lng },
                        placeRank,
                        addresstype,
                        type,
                        displayName: item.display_name || item.name || '',
                        isTownCenter,
                    };

                    saveToGeocodeCache(cleanQuery, result);
                    return result;
                }
            }
        }
    } catch (e) {
        console.warn('Errore richiesta geocoding:', e);
    }

    return null;
}

/**
 * Risolve autonomamente le coordinate per un luogo garantendo la massima precisione:
 * 1. Coordinate dirette esistenti
 * 2. Estrazione diretta da Google Maps URL
 * 3. Ricerca per Nome struttura + Comune (identifica basi scout, campeggi, conventi, rifugi)
 * 4. Ricerca per Indirizzo civico specifico
 * 5. Fallback sul centro del comune (segnalato come approssimazione)
 */
export async function resolveLocationCoordinates(data: {
    name?: string;
    coordinates?: { lat: number; lng: number };
    googleMapsLink?: string;
    address?: string;
    commune?: string;
    province?: string;
    region?: string;
}): Promise<ResolutionResult | null> {
    // 1. Se ha già coordinate valide dirette
    if (data.coordinates?.lat && data.coordinates?.lng) {
        const lat = Number(data.coordinates.lat);
        const lng = Number(data.coordinates.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
            return {
                coords: { lat, lng },
                isEstimated: false,
                isTownCenter: false,
                source: 'direct',
                message: 'Coordinate manuali confermate',
            };
        }
    }

    // 2. Se ha un link Google Maps con coordinate estraibili
    if (data.googleMapsLink) {
        const extracted = extractCoordsFromMapsUrl(data.googleMapsLink);
        if (extracted) {
            return {
                coords: extracted,
                isEstimated: false,
                isTownCenter: false,
                source: 'maps_url',
                message: 'Coordinate ricavate con precisione dal link Google Maps',
            };
        }
    }

    // 3. Cerca per Nome Struttura + Comune (es. "Base Scout Spettine, Bettola")
    if (data.name && data.name.trim().length > 2) {
        const poiQuery = [
            data.name.trim(),
            data.commune?.trim(),
            data.province ? `(${data.province.trim()})` : '',
            data.region?.trim(),
            'Italia',
        ].filter(Boolean).join(', ');

        const poiResult = await geocodeDetailed(poiQuery);
        if (poiResult && !poiResult.isTownCenter) {
            return {
                coords: poiResult.coords,
                isEstimated: false,
                isTownCenter: false,
                source: 'poi_name',
                message: `Punto esatto trovato per nome struttura: "${poiResult.displayName}"`,
            };
        }
    }

    // 4. Cerca per Indirizzo civico + Comune
    if (data.address && data.address.trim().length > 2) {
        const addressQuery = [
            data.address.trim(),
            data.commune?.trim(),
            data.province ? `(${data.province.trim()})` : '',
            data.region?.trim(),
            'Italia',
        ].filter(Boolean).join(', ');

        const addressResult = await geocodeDetailed(addressQuery);
        if (addressResult && !addressResult.isTownCenter) {
            return {
                coords: addressResult.coords,
                isEstimated: true,
                isTownCenter: false,
                source: 'address',
                message: `Posizione ricavata da indirizzo civico: "${addressResult.displayName}"`,
            };
        }
    }

    // 5. Fallback con solo Comune (segnalando chiaramente che è il centro paese)
    if (data.commune && data.commune.trim().length > 1) {
        const communeQuery = [
            data.commune.trim(),
            data.province ? `(${data.province.trim()})` : '',
            data.region?.trim(),
            'Italia',
        ].filter(Boolean).join(', ');

        const communeResult = await geocodeDetailed(communeQuery);
        if (communeResult) {
            return {
                coords: communeResult.coords,
                isEstimated: true,
                isTownCenter: true,
                source: 'commune_fallback',
                message: `Posizione approssimata al centro del comune di ${data.commune}. Trascina il pin o inserisci le coordinate esatte.`,
            };
        }
    }

    return null;
}
