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

export interface MatchedPillars {
    name: boolean;
    nameDetail?: string;
    commune: boolean;
    communeDetail?: string;
    address: boolean;
    addressDetail?: string;
    coordinates: boolean;
    coordinatesDetail?: string;
    contacts: boolean;
    contactsDetail?: string;
}

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
    isUnequivocal: boolean; // True solo se coordinate, indirizzo, contatti, nome e comune sono uguali
    pillars: MatchedPillars;
}

export interface DuplicateDetectionResult {
    isDuplicate: boolean; // true se critical (inequivocabilmente uguale)
    hasWarning: boolean;  // true se c'è almeno un medium o high
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

        let distanceMeters: number | undefined = undefined;

        // ----------------------------------------------------
        // VALUTAZIONE DEI 5 PILASTRI IDENTIFICATIVI:
        // 1. NOME
        // 2. COMUNE
        // 3. INDIRIZZO
        // 4. COORDINATE
        // 5. CONTATTI
        // ----------------------------------------------------

        // 1. NOME
        const locNameNorm = normalizeText(loc.name);
        const locTokens = extractDistinctiveTokens(loc.name);
        const commonTokens = candTokens.filter(t => locTokens.includes(t));
        const nameSim = (candNameNorm && locNameNorm) ? stringSimilarity(candNameNorm, locNameNorm) : 0;
        const matchName = Boolean(
            candNameNorm && locNameNorm && (
                candNameNorm === locNameNorm ||
                nameSim >= 0.85 ||
                (candTokens.length > 0 && locTokens.length > 0 && commonTokens.length === candTokens.length && commonTokens.length === locTokens.length)
            )
        );

        // 2. COMUNE
        const locCommuneNorm = normalizeText(loc.commune);
        const matchCommune = Boolean(
            candCommuneNorm && locCommuneNorm && (
                candCommuneNorm === locCommuneNorm ||
                candCommuneNorm.includes(locCommuneNorm) ||
                locCommuneNorm.includes(candCommuneNorm)
            )
        );

        // 3. INDIRIZZO
        const locAddressNorm = normalizeText(loc.address);
        const addressSim = (candAddressNorm && locAddressNorm) ? stringSimilarity(candAddressNorm, locAddressNorm) : 0;
        const matchAddress = Boolean(
            candAddressNorm && locAddressNorm && (
                candAddressNorm === locAddressNorm ||
                addressSim >= 0.75 ||
                candAddressNorm.includes(locAddressNorm) ||
                locAddressNorm.includes(candAddressNorm)
            )
        );

        // 4. COORDINATE (dirette o ricavate da google maps link)
        let locCoords = loc.coordinates;
        if ((!locCoords || !locCoords.lat || !locCoords.lng) && loc.googleMapsLink) {
            const ext = extractCoordsFromMapsUrl(loc.googleMapsLink);
            if (ext) locCoords = ext;
        }
        if (candCoords?.lat && candCoords?.lng && locCoords?.lat && locCoords?.lng) {
            distanceMeters = haversineDistanceMeters(candCoords.lat, candCoords.lng, locCoords.lat, locCoords.lng);
        }
        const matchCoords = Boolean(distanceMeters !== undefined && distanceMeters <= 250);

        // 5. CONTATTI (telefono, whatsapp, email, facebook, instagram, website)
        const locPhones = getAllPhones(loc);
        const matchedPhone = candPhones.find(cp => locPhones.includes(cp));

        const locEmails = getAllEmails(loc);
        const matchedEmail = candEmails.find(ce => locEmails.includes(ce));

        const candFb = normalizeSocialHandle(candidate.facebook);
        const locFb = normalizeSocialHandle(loc.facebook);
        const matchedFb = (candFb && locFb && candFb === locFb && candFb.length >= 3) ? candFb : undefined;

        const candIg = normalizeSocialHandle(candidate.instagram);
        const locIg = normalizeSocialHandle(loc.instagram);
        const matchedIg = (candIg && locIg && candIg === locIg && candIg.length >= 3) ? candIg : undefined;

        const locWebsite = normalizeUrl(loc.website);
        const matchedWebsite = (candWebsite && locWebsite && candWebsite === locWebsite && !candWebsite.startsWith('facebook.com') && !candWebsite.startsWith('instagram.com') && candWebsite.length > 4) ? candWebsite : undefined;

        const matchContacts = Boolean(matchedPhone || matchedEmail || matchedFb || matchedIg || matchedWebsite);

        const matchedContactDetail = matchedPhone
            ? `Tel: ...${matchedPhone.slice(-6)}`
            : (matchedEmail
                ? `Email: ${matchedEmail}`
                : (matchedFb
                    ? `Facebook: ${matchedFb}`
                    : (matchedIg
                        ? `Instagram: @${matchedIg}`
                        : (matchedWebsite ? `Sito: ${matchedWebsite}` : undefined))));

        const pillars: MatchedPillars = {
            name: matchName,
            nameDetail: matchName ? `"${loc.name}"` : undefined,
            commune: matchCommune,
            communeDetail: matchCommune ? loc.commune : undefined,
            address: matchAddress,
            addressDetail: matchAddress ? loc.address : undefined,
            coordinates: matchCoords,
            coordinatesDetail: matchCoords ? `~${Math.round(distanceMeters || 0)}m` : undefined,
            contacts: matchContacts,
            contactsDetail: matchedContactDetail,
        };

        // REQUISITO UTENTE:
        // Una struttura è inequivocabilmente uguale ad una già registrata se:
        // coordinate, indirizzo, contatti, nome e comune sono uguali.
        const isUnequivocal = matchName && matchCommune && matchAddress && matchCoords && matchContacts;

        let confidence: DuplicateConfidence = 'medium';
        let score = 0;
        let blocking = false;
        const reasons: DuplicateReason[] = [];

        if (isUnequivocal) {
            // TUTTI E 5 I FATTORI COINCIDONO: BLOCCO CRITICO INEQUIVOCABILE
            confidence = 'critical';
            score = 100;
            blocking = true;

            reasons.push({
                type: 'name_commune',
                message: `Struttura inequivocabilmente identica: coordinate, indirizzo, contatti, nome e comune coincidono con "${loc.name}" a ${loc.commune}`,
                severity: 'critical'
            });
            reasons.push({
                type: 'name_commune',
                message: `Nome coincidente: "${loc.name}"`,
                severity: 'critical'
            });
            reasons.push({
                type: 'name_commune',
                message: `Comune coincidente: ${loc.commune}`,
                severity: 'critical'
            });
            reasons.push({
                type: 'address',
                message: `Indirizzo civico coincidente: "${loc.address}"`,
                severity: 'critical'
            });
            reasons.push({
                type: 'coordinates',
                message: `Coordinate coincidenti: a soli ${Math.round(distanceMeters || 0)} metri di distanza`,
                severity: 'critical'
            });
            if (matchedContactDetail) {
                reasons.push({
                    type: matchedPhone ? 'phone' : (matchedEmail ? 'email' : (matchedFb || matchedIg ? 'social' : 'website')),
                    message: `Contatto coincidente: ${matchedContactDetail}`,
                    severity: 'critical'
                });
            }
        } else {
            // FATTORI PARZIALMENTE COINCIDENTI (nessun blocco permanente)
            const matchedPillarsCount = [matchName, matchCommune, matchAddress, matchCoords, matchContacts].filter(Boolean).length;

            if (matchName && matchCommune && (matchAddress || matchCoords || matchContacts)) {
                // 3 o 4 fattori coincidenti inclusi nome e comune -> Alta probabilità
                confidence = 'high';
                score = 80 + (matchedPillarsCount * 4);
                blocking = false;

                reasons.push({
                    type: 'name_commune',
                    message: `Nome e comune coincidenti con "${loc.name}" a ${loc.commune}`,
                    severity: 'high'
                });
                if (matchAddress) {
                    reasons.push({ type: 'address', message: `Stesso indirizzo civico ("${loc.address}")`, severity: 'high' });
                }
                if (matchCoords) {
                    reasons.push({ type: 'coordinates', message: `Coordinate geografiche vicine (~${Math.round(distanceMeters || 0)}m)`, severity: 'high' });
                }
                if (matchContacts && matchedContactDetail) {
                    reasons.push({ type: 'phone', message: `Recapito di contatto coincidente: ${matchedContactDetail}`, severity: 'high' });
                }
            } else if (matchAddress && matchCoords && matchContacts) {
                // Stesso indirizzo, coordinate e contatto
                confidence = 'high';
                score = 88;
                blocking = false;

                reasons.push({
                    type: 'address',
                    message: `Stesso indirizzo e coordinate a ${loc.commune} con contatto coincidente (${matchedContactDetail})`,
                    severity: 'high'
                });
            } else if (matchCoords && matchContacts) {
                // Stesse coordinate e stesso contatto
                confidence = 'high';
                score = 82;
                blocking = false;

                reasons.push({
                    type: 'coordinates',
                    message: `Stesse coordinate GPS (~${Math.round(distanceMeters || 0)}m) e stesso contatto (${matchedContactDetail})`,
                    severity: 'high'
                });
            } else if (matchName && matchCommune) {
                // Solo nome e comune
                confidence = nameSim >= 0.95 ? 'high' : 'medium';
                score = nameSim >= 0.95 ? 78 : 65;
                blocking = false;

                reasons.push({
                    type: 'name_commune',
                    message: `Nome analogo ("${loc.name}") nello stesso comune di ${loc.commune}`,
                    severity: confidence
                });
            } else if (matchCoords && distanceMeters !== undefined && distanceMeters <= 150) {
                // Coordinate vicine
                confidence = 'medium';
                score = 60;
                blocking = false;

                reasons.push({
                    type: 'coordinates',
                    message: `Posizione geografica vicina a "${loc.name}" (~${Math.round(distanceMeters)}m)`,
                    severity: 'medium'
                });
            } else if (matchContacts && matchedContactDetail) {
                // Solo contatto coincidente
                confidence = 'medium';
                score = 55;
                blocking = false;

                reasons.push({
                    type: matchedPhone ? 'phone' : (matchedEmail ? 'email' : 'social'),
                    message: `Recapito telefonico o telematico coincidente (${matchedContactDetail}) associato anche a "${loc.name}" (${loc.commune})`,
                    severity: 'medium'
                });
            } else if (matchAddress && matchCommune) {
                // Solo indirizzo nel comune
                confidence = 'medium';
                score = 55;
                blocking = false;

                reasons.push({
                    type: 'address',
                    message: `Stesso indirizzo civico a ${loc.commune} ("${loc.address}")`,
                    severity: 'medium'
                });
            } else if (candTokens.length > 0 && commonTokens.length > 0 && (candCommuneNorm === locCommuneNorm || candProvinceNorm === normalizeText(loc.province))) {
                confidence = 'medium';
                score = 50;
                blocking = false;

                reasons.push({
                    type: 'name_commune',
                    message: `Denominazione affine ("${commonTokens.join(', ')}") per una struttura a ${loc.commune}`,
                    severity: 'medium'
                });
            }
        }

        if (score >= 50 && reasons.length > 0) {
            matches.push({
                location: loc,
                confidence,
                score,
                reasons,
                distanceMeters,
                blocking,
                isUnequivocal,
                pillars,
            });
        }
    }

    // Ordina i match per punteggio decrescente
    matches.sort((a, b) => b.score - a.score);

    const bestMatch = matches.length > 0 ? matches[0] : null;
    const isDuplicate = Boolean(bestMatch && bestMatch.confidence === 'critical');
    const hasWarning = Boolean(bestMatch && (bestMatch.confidence === 'high' || bestMatch.confidence === 'medium'));

    return {
        isDuplicate,
        hasWarning,
        bestMatch,
        allMatches: matches
    };
}
