// Helper per estrazione coordinate e geocoding autonomo

export interface Coordinates {
    lat: number;
    lng: number;
}

const GEO_CACHE_KEY = 'orme_geocode_cache_v1';

// Legge la cache locale del geocoding per non ripetere richieste
function getGeocodeCache(): Record<string, Coordinates> {
    try {
        const cached = localStorage.getItem(GEO_CACHE_KEY);
        if (cached) return JSON.parse(cached);
    } catch {
        // ignore
    }
    return {};
}

// Salva in cache
function saveToGeocodeCache(query: string, coords: Coordinates) {
    try {
        const cache = getGeocodeCache();
        cache[query.trim().toLowerCase()] = coords;
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
    } catch {
        // ignore
    }
}

/**
 * Estrae le coordinate da qualsiasi formato di URL Google Maps
 */
export function extractCoordsFromMapsUrl(url?: string): Coordinates | null {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    try {
        const decoded = decodeURIComponent(trimmed);

        // 1. Formato !3dlat!4dlng (comunissimo nei link google.com/maps/place/...)
        const m3d = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (m3d) {
            const lat = parseFloat(m3d[1]);
            const lng = parseFloat(m3d[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // 2. Formato @lat,lng,zoom (es. /@41.123456,16.54321,15z)
        const mat = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (mat) {
            const lat = parseFloat(mat[1]);
            const lng = parseFloat(mat[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // 3. Parametri di query: q=lat,lng o ll=lat,lng o query=lat,lng o daddr=lat,lng o saddr=lat,lng
        const mq = decoded.match(/[?&](?:q|ll|query|daddr|saddr)=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (mq) {
            const lat = parseFloat(mq[1]);
            const lng = parseFloat(mq[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // 4. Formato loc:lat+lng o loc:lat,lng
        const mloc = decoded.match(/loc:(-?\d+\.\d+)[+,](-?\d+\.\d+)/);
        if (mloc) {
            const lat = parseFloat(mloc[1]);
            const lng = parseFloat(mloc[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }

        // 5. Coppia di numeri decimali separati da virgola
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
 * Geocodifica un indirizzo / comune tramite OpenStreetMap Nominatim (con cache locale)
 */
export async function geocodeAddress(query: string): Promise<Coordinates | null> {
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
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                if (!isNaN(lat) && !isNaN(lng)) {
                    const coords = { lat, lng };
                    saveToGeocodeCache(cleanQuery, coords);
                    return coords;
                }
            }
        }
    } catch (e) {
        console.warn('Errore richiesta geocoding:', e);
    }

    return null;
}

/**
 * Risolve autonomamente le coordinate per un luogo (da link Maps o indirizzo/comune)
 */
export async function resolveLocationCoordinates(data: {
    coordinates?: { lat: number; lng: number };
    googleMapsLink?: string;
    address?: string;
    commune?: string;
    province?: string;
    region?: string;
}): Promise<{ coords: Coordinates; isEstimated: boolean } | null> {
    // 1. Se ha già coordinate valide dirette
    if (data.coordinates?.lat && data.coordinates?.lng) {
        const lat = Number(data.coordinates.lat);
        const lng = Number(data.coordinates.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
            return { coords: { lat, lng }, isEstimated: false };
        }
    }

    // 2. Se ha un link Google Maps con coordinate estraibili
    if (data.googleMapsLink) {
        const extracted = extractCoordsFromMapsUrl(data.googleMapsLink);
        if (extracted) {
            return { coords: extracted, isEstimated: false };
        }
    }

    // 3. Prova geocodifica combinando indirizzo, comune, provincia, regione
    const parts = [
        data.address,
        data.commune,
        data.province ? `(${data.province})` : '',
        data.region,
        'Italia'
    ].filter(Boolean);

    if (parts.length > 1) {
        const fullQuery = parts.join(', ');
        const geocoded = await geocodeAddress(fullQuery);
        if (geocoded) return { coords: geocoded, isEstimated: true };
    }

    // 4. Fallback con solo comune e regione se l'indirizzo specifico non è stato trovato
    if (data.commune) {
        const fallbackQuery = [data.commune, data.region, 'Italia'].filter(Boolean).join(', ');
        const fallbackGeocoded = await geocodeAddress(fallbackQuery);
        if (fallbackGeocoded) return { coords: fallbackGeocoded, isEstimated: true };
    }

    return null;
}
