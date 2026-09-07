import { Location } from '@/types';
import { extractCoordsFromMapsUrl } from './geo';

export interface LocationCandidate {
    id?: string; // Se in modifica, ID da escludere
    name: string;
    region?: string;
    province?: string;
    commune?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
    googleMapsLink?: string;
    website?: string;
    phone?: string;
    whatsapp?: string;
    contacts?: { value: string; type?: string; name?: string; role?: string }[];
    email?: string;
    emails?: string[];
    facebook?: string;
    instagram?: string;
}

export type DuplicateConfidence = 'critical' | 'high' | 'medium';

export interface DuplicateReason {
    type: 'coordinates' | 'phone' | 'email' | 'maps_link' | 'website' | 'social' | 'name_commune' | 'address';
    message: string;
    severity: DuplicateConfidence;
}

export interface DuplicateMatch {
    location: Location;
    confidence: DuplicateConfidence;
    score: number; // 0 to 100
    reasons: DuplicateReason[];
    distanceMeters?: number;
    blocking: boolean;
}

export interface DuplicateDetectionResult {
    isDuplicate: boolean; // true se critical o high
    hasWarning: boolean;  // true se c'è almeno un medium
    bestMatch: DuplicateMatch | null;
    allMatches: DuplicateMatch[];
}

// Calcolo distanza geodetica con formula dell'emiverseno (Haversine)
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Raggio medio terra in metri
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Normalizza numero di telefono alle ultime 8-10 cifre
export function normalizePhoneNumber(phone?: string): string {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    // Rimuovi prefisso internazionale italiano 0039 o 39 se seguito da 9-10 cifre
    if (digits.startsWith('0039')) digits = digits.slice(4);
    else if (digits.startsWith('39') && digits.length > 10) digits = digits.slice(2);
    // Considera le ultime 9 o 10 cifre significative
    if (digits.length >= 9) return digits.slice(-9);
    return digits;
}

// Normalizza email
export function normalizeEmail(email?: string): string {
    if (!email) return '';
    return email.trim().toLowerCase();
}

// Normalizza URL sito web (rimuove protocollo, www, slash finale, parametri)
export function normalizeUrl(url?: string): string {
    if (!url) return '';
    try {
        let clean = url.trim().toLowerCase();
        clean = clean.replace(/^https?:\/\//, '').replace(/^www\./, '');
        clean = clean.split('?')[0].split('#')[0];
        clean = clean.replace(/\/+$/, '');
        return clean;
    } catch {
        return url.trim().toLowerCase();
    }
}

// Normalizza handle social (rimuove domini facebook, instagram, @, query params)
export function normalizeSocialHandle(val?: string): string {
    if (!val) return '';
    let s = val.trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
    s = s.replace(/^(facebook\.com|fb\.me|fb\.com|instagram\.com|instagr\.am)\//, '');
    s = s.replace(/^@/, '');
    s = s.split('?')[0].split('#')[0];
    s = s.replace(/\/+$/, '');
    return s.trim();
}

// Normalizza testo rimuovendo accenti, punteggiatura e spazi doppi
export function normalizeText(text?: string): string {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Stopwords scout generiche italiane che non identificano univocamente la struttura
const SCOUT_GENERIC_STOPWORDS = new Set([
    'base', 'scout', 'rifugio', 'baita', 'casa', 'ostello', 'parrocchia', 'chiesa',
    'terreno', 'campo', 'centro', 'comunita', 'san', 'sant', 'santa', 'santo', 's',
    'di', 'del', 'della', 'delle', 'dei', 'degli', 'a', 'in', 'la', 'il', 'lo', 'le',
    'al', 'ai', 'vacanze', 'soggiorno', 'comunale', 'don', 'de', 'prato', 'prati',
    'bosco', 'montagna', 'valle', 'val', 'monte', 'colle', 'alpe', 'podere', 'cascina',
    'foresta', 'agriturismo', 'oasi', 'convento', 'eremo', 'agesci', 'cngei', 'fse'
]);

// Estrae i token distintivi (core keywords)
export function extractDistinctiveTokens(name: string): string[] {
    const norm = normalizeText(name);
    return norm
        .split(' ')
        .map(t => t.trim())
        .filter(t => t.length > 2 && !SCOUT_GENERIC_STOPWORDS.has(t));
}

// Calcola la distanza di Levenshtein tra due stringhe
export function getLevenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const matrix: number[][] = [];
    for (let i = 0; i <= m; i++) matrix[i] = [i];
    for (let j = 0; j <= n; j++) matrix[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[m][n];
}

// Calcola similarità testuale compresa tra 0 e 1 (basata su Levenshtein)
export function stringSimilarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    const dist = getLevenshteinDistance(a, b);
    return 1 - dist / maxLen;
}

// Estrae tutti i telefoni normalizzati associati a una struttura o candidato
function getAllPhones(obj: {
    phone?: string;
    whatsapp?: string;
    contacts?: { value?: string; type?: string }[];
}): string[] {
    const set = new Set<string>();
    if (obj.phone) {
        const norm = normalizePhoneNumber(obj.phone);
        if (norm.length >= 8) set.add(norm);
    }
    if (obj.whatsapp) {
        const norm = normalizePhoneNumber(obj.whatsapp);
        if (norm.length >= 8) set.add(norm);
    }
    if (Array.isArray(obj.contacts)) {
        for (const c of obj.contacts) {
            if (c.value) {
                const norm = normalizePhoneNumber(c.value);
                if (norm.length >= 8) set.add(norm);
            }
        }
    }
    return Array.from(set);
}

// Estrae tutte le email normalizzate associate a una struttura o candidato
function getAllEmails(obj: {
    email?: string;
    emails?: string[];
    contacts?: { value?: string; type?: string }[];
}): string[] {
    const set = new Set<string>();
    if (obj.email) {
        const split = obj.email.split(/[,;\s]+/).map(s => normalizeEmail(s)).filter(Boolean);
        split.forEach(e => set.add(e));
    }
    if (Array.isArray(obj.emails)) {
        for (const e of obj.emails) {
            const norm = normalizeEmail(e);
            if (norm && norm.includes('@')) set.add(norm);
        }
    }
    if (Array.isArray(obj.contacts)) {
        for (const c of obj.contacts) {
            if (c.type === 'email' && c.value) {
                const norm = normalizeEmail(c.value);
                if (norm && norm.includes('@')) set.add(norm);
            }
        }
    }
    return Array.from(set);
}

/**
 * Motore di rilevamento duplicati multi-fattore
 * Confronta il luogo che si sta inserendo/modificando con l'intero archivio dei luoghi registrati
 */
export function findDuplicateLocation(
    candidate: LocationCandidate,
    existingLocations: Location[]
): DuplicateDetectionResult {
    if (!existingLocations || existingLocations.length === 0) {
        return { isDuplicate: false, hasWarning: false, bestMatch: null, allMatches: [] };
    }

    const candNameNorm = normalizeText(candidate.name);
    const candCommuneNorm = normalizeText(candidate.commune);
    const candProvinceNorm = normalizeText(candidate.province);
    const candAddressNorm = normalizeText(candidate.address);
    const candTokens = extractDistinctiveTokens(candidate.name);

    // Risoluzione coordinate del candidato
    let candCoords = candidate.coordinates;
    if ((!candCoords || !candCoords.lat || !candCoords.lng) && candidate.googleMapsLink) {
        const extracted = extractCoordsFromMapsUrl(candidate.googleMapsLink);
        if (extracted) candCoords = extracted;
    }

    const candPhones = getAllPhones(candidate);
    const candEmails = getAllEmails(candidate);
    const candWebsite = normalizeUrl(candidate.website);

    const matches: DuplicateMatch[] = [];

    for (const loc of existingLocations) {
        // Escludi la struttura stessa se siamo in modalità modifica
        if (candidate.id && loc.id === candidate.id) continue;

        let score = 0;
        const reasons: DuplicateReason[] = [];
        let distanceMeters: number | undefined = undefined;

        // ----------------------------------------------------
        // 1. CONFRONTO COORDINATE GPS
        // ----------------------------------------------------
        let locCoords = loc.coordinates;
        if ((!locCoords || !locCoords.lat || !locCoords.lng) && loc.googleMapsLink) {
            const ext = extractCoordsFromMapsUrl(loc.googleMapsLink);
            if (ext) locCoords = ext;
        }

        if (candCoords?.lat && candCoords?.lng && locCoords?.lat && locCoords?.lng) {
            distanceMeters = haversineDistanceMeters(
                candCoords.lat,
                candCoords.lng,
                locCoords.lat,
                locCoords.lng
            );

            if (distanceMeters <= 150) {
                score += 96;
                reasons.push({
                    type: 'coordinates',
                    message: `Stesse coordinate geografiche (a soli ${Math.round(distanceMeters)} metri da "${loc.name}")`,
                    severity: 'critical'
                });
            } else if (distanceMeters <= 350) {
                // Se sono molto vicini (150-350m) e nello stesso comune
                const locCommune = normalizeText(loc.commune);
                const sameCommune = candCommuneNorm && locCommune && (candCommuneNorm === locCommune || candCommuneNorm.includes(locCommune) || locCommune.includes(candCommuneNorm));
                if (sameCommune) {
                    score += 85;
                    reasons.push({
                        type: 'coordinates',
                        message: `Posizione adiacente a ${Math.round(distanceMeters)}m da "${loc.name}" a ${loc.commune}`,
                        severity: 'high'
                    });
                } else {
                    score += 65;
                    reasons.push({
                        type: 'coordinates',
                        message: `Posizione geografica vicina (${Math.round(distanceMeters)} metri)`,
                        severity: 'medium'
                    });
                }
            } else if (distanceMeters <= 800) {
                const locCommune = normalizeText(loc.commune);
                if (candCommuneNorm && locCommune && candCommuneNorm === locCommune) {
                    score += 40;
                    reasons.push({
                        type: 'coordinates',
                        message: `Posizione nello stesso raggio di ${Math.round(distanceMeters)} metri a ${loc.commune}`,
                        severity: 'medium'
                    });
                }
            }
        }

        // ----------------------------------------------------
        // 2. CONFRONTO NUMERI DI TELEFONO E WHATSAPP
        // ----------------------------------------------------
        const locPhones = getAllPhones(loc);
        for (const cp of candPhones) {
            for (const lp of locPhones) {
                if (cp === lp && cp.length >= 8) {
                    score += 95;
                    reasons.push({
                        type: 'phone',
                        message: `Stesso recapito telefonico di riferimento (termina con ...${cp.slice(-6)})`,
                        severity: 'critical'
                    });
                    break;
                }
            }
        }

        // ----------------------------------------------------
        // 3. CONFRONTO EMAIL
        // ----------------------------------------------------
        const locEmails = getAllEmails(loc);
        for (const ce of candEmails) {
            for (const le of locEmails) {
                if (ce === le && ce.length > 5) {
                    score += 95;
                    reasons.push({
                        type: 'email',
                        message: `Stesso indirizzo email di contatto ("${ce}")`,
                        severity: 'critical'
                    });
                    break;
                }
            }
        }

        // ----------------------------------------------------
        // 4. CONFRONTO SITO WEB
        // ----------------------------------------------------
        const locWebsite = normalizeUrl(loc.website);
        if (candWebsite && locWebsite && candWebsite.length > 4) {
            // Evita match su domini generici di social media a meno che l'intero path coincida
            const isGenericDomain = candWebsite.startsWith('facebook.com') || candWebsite.startsWith('instagram.com') || candWebsite.startsWith('google.com');
            if (!isGenericDomain && candWebsite === locWebsite) {
                score += 90;
                reasons.push({
                    type: 'website',
                    message: `Stesso sito web ("${loc.website}")`,
                    severity: 'critical'
                });
            }
        }

        // ----------------------------------------------------
        // 4b. CONFRONTO CANALI SOCIAL (Facebook, Instagram)
        // ----------------------------------------------------
        const candFb = normalizeSocialHandle(candidate.facebook);
        const locFb = normalizeSocialHandle(loc.facebook);
        if (candFb && locFb && candFb === locFb && candFb.length >= 3) {
            score += 92;
            reasons.push({
                type: 'social',
                message: `Stessa pagina Facebook ("${loc.facebook}")`,
                severity: 'critical'
            });
        }

        const candIg = normalizeSocialHandle(candidate.instagram);
        const locIg = normalizeSocialHandle(loc.instagram);
        if (candIg && locIg && candIg === locIg && candIg.length >= 3) {
            score += 92;
            reasons.push({
                type: 'social',
                message: `Stesso profilo Instagram ("${loc.instagram}")`,
                severity: 'critical'
            });
        }

        // ----------------------------------------------------
        // 5. CONFRONTO TOPONOMASTICO: NOME + COMUNE
        // ----------------------------------------------------
        const locCommuneNorm = normalizeText(loc.commune);
        const locProvinceNorm = normalizeText(loc.province);
        const sameCommune = candCommuneNorm && locCommuneNorm && (
            candCommuneNorm === locCommuneNorm ||
            candCommuneNorm.includes(locCommuneNorm) ||
            locCommuneNorm.includes(candCommuneNorm)
        );
        const sameProvince = candProvinceNorm && locProvinceNorm && (
            candProvinceNorm === locProvinceNorm ||
            candProvinceNorm.includes(locProvinceNorm) ||
            locProvinceNorm.includes(candProvinceNorm)
        );

        const locNameNorm = normalizeText(loc.name);

        // 5a. Nome identico
        if (candNameNorm && locNameNorm && candNameNorm === locNameNorm) {
            if (sameCommune) {
                score += 95;
                reasons.push({
                    type: 'name_commune',
                    message: `Nome identico ("${loc.name}") nello stesso comune di ${loc.commune}`,
                    severity: 'critical'
                });
            } else {
                score += 70;
                reasons.push({
                    type: 'name_commune',
                    message: `Nome identico ("${loc.name}") registrato in un altro comune (${loc.commune || loc.region})`,
                    severity: 'medium'
                });
            }
        } else if (sameCommune && candNameNorm && locNameNorm) {
            // 5b. Stesso comune con token distintivi coincidenti (es. "Spettine" a Bettola)
            const locTokens = extractDistinctiveTokens(loc.name);
            const commonTokens = candTokens.filter(t => locTokens.includes(t));

            if (commonTokens.length > 0) {
                const tokenScore = Math.min(85, 75 + commonTokens.length * 5);
                score += tokenScore;
                reasons.push({
                    type: 'name_commune',
                    message: `Nome fortemente coincidente ("${commonTokens.join(', ')}") nello stesso comune di ${loc.commune}`,
                    severity: 'high'
                });
            } else {
                // 5c. Similarità di stringa elevata nello stesso comune
                const sim = stringSimilarity(candNameNorm, locNameNorm);
                if (sim >= 0.75) {
                    score += 80;
                    reasons.push({
                        type: 'name_commune',
                        message: `Denominazione quasi identica a "${loc.name}" a ${loc.commune}`,
                        severity: 'high'
                    });
                } else if (sim >= 0.55) {
                    score += 50;
                    reasons.push({
                        type: 'name_commune',
                        message: `Nome affine a "${loc.name}" a ${loc.commune}`,
                        severity: 'medium'
                    });
                }
            }
        } else if (!sameCommune && sameProvince && candNameNorm && locNameNorm) {
            // 5d. Stessa provincia con token distintivi coincidenti (comune confinante o frazione)
            const locTokens = extractDistinctiveTokens(loc.name);
            const commonTokens = candTokens.filter(t => locTokens.includes(t));
            if (commonTokens.length > 0) {
                score += 55;
                reasons.push({
                    type: 'name_commune',
                    message: `Nome affine ("${commonTokens.join(', ')}") nella stessa provincia (${loc.province})`,
                    severity: 'medium'
                });
            }
        }

        // ----------------------------------------------------
        // 6. STESSO INDIRIZZO CIVICO NELLO STESSO COMUNE
        // ----------------------------------------------------
        const locAddressNorm = normalizeText(loc.address);
        if (sameCommune && candAddressNorm && locAddressNorm && candAddressNorm.length > 5) {
            if (candAddressNorm === locAddressNorm || stringSimilarity(candAddressNorm, locAddressNorm) > 0.8) {
                score += 85;
                reasons.push({
                    type: 'address',
                    message: `Stesso indirizzo civico a ${loc.commune} ("${loc.address}")`,
                    severity: 'high'
                });
            }
        }

        // Cap score a 100
        const finalScore = Math.min(100, score);

        if (finalScore >= 50 && reasons.length > 0) {
            const hasCriticalReason = reasons.some(r => r.severity === 'critical');
            const hasHighReason = reasons.some(r => r.severity === 'high');

            let confidence: DuplicateConfidence = 'medium';
            if (hasCriticalReason || finalScore >= 90) {
                confidence = 'critical';
            } else if (hasHighReason || finalScore >= 75) {
                confidence = 'high';
            }

            matches.push({
                location: loc,
                confidence,
                score: finalScore,
                reasons,
                distanceMeters,
                blocking: confidence === 'critical' || confidence === 'high'
            });
        }
    }

    // Ordina i match per punteggio decrescente
    matches.sort((a, b) => b.score - a.score);

    const bestMatch = matches.length > 0 ? matches[0] : null;
    const isDuplicate = Boolean(bestMatch && (bestMatch.confidence === 'critical' || bestMatch.confidence === 'high'));
    const hasWarning = matches.length > 0;

    return {
        isDuplicate,
        hasWarning,
        bestMatch,
        allMatches: matches
    };
}
