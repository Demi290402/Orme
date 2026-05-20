import { getUser, updateUser } from './data';

export const LEVELS = [
    { level: 1, name: 'Piede Tenero', min: 0, max: 49, color: '#9CA3AF' },
    { level: 2, name: 'Capo Sestiglia', min: 50, max: 149, color: '#0EA5E9' },
    { level: 3, name: 'Esploratore/Guida', min: 150, max: 274, color: '#78350F' },
    { level: 4, name: 'Giovane Capo', min: 275, max: 399, color: '#F97316' },
    { level: 5, name: 'Sentinella', min: 400, max: 599, color: '#EAB308' },
    { level: 6, name: 'Capo Brevettato', min: 600, max: Infinity, color: '#A855F7' },
];

export function getLevelInfo(points: number) {
    const current = LEVELS.find(l => points >= l.min && points <= l.max) || LEVELS[LEVELS.length - 1];
    const next = LEVELS.find(l => l.level === current.level + 1);
    return {
        current,
        next,
        pointsToNext: next ? next.min - points : 0
    };
}

// ─── BADGE DEFINITIONS ───────────────────────────────────────────────────────
// Each badge specifies: the counter field to check, the threshold, and the bonus points.
export interface BadgeDef {
    name: string;
    description: string;
    icon: string;
    statKey: string;       // key on User object
    goal: number;
    bonusPoints: number;
}

export const BADGES: Record<string, BadgeDef> = {
    // ── Passive: Verbali ─────────────────────────────────────────────────────
    'primo_verbale':    { name: 'Primo Verbale',    icon: '📖', description: 'Hai visualizzato il tuo primo verbale',        statKey: 'verbaliRead',         goal: 1,  bonusPoints: 5  },
    'lettore_assiduo':  { name: 'Lettore Assiduo',  icon: '📚', description: 'Hai visualizzato 5 verbali',                  statKey: 'verbaliRead',         goal: 5,  bonusPoints: 10 },
    'archivista':       { name: 'Archivista',       icon: '🗂️', description: 'Hai visualizzato 20 verbali',                 statKey: 'verbaliRead',         goal: 20, bonusPoints: 20 },

    // ── Passive: Ricerca luoghi (SCALETTA 5, 10, 15) ─────────────────────────
    // L/C
    'esploratore_lc_5':  { name: 'Cucciolo L/C',     icon: '🐺', description: 'Hai cercato luoghi per L/C 5 volte',         statKey: 'searchesLC',          goal: 5,  bonusPoints: 5 },
    'esploratore_lc_10': { name: 'Lupo Anziano',     icon: '🐾', description: 'Hai cercato luoghi per L/C 10 volte',        statKey: 'searchesLC',          goal: 10, bonusPoints: 10 },
    'esploratore_lc_15': { name: 'Akela della Map',  icon: '🏔️', description: 'Hai cercato luoghi per L/C 15 volte',        statKey: 'searchesLC',          goal: 15, bonusPoints: 15 },
    // E/G
    'esploratore_eg_5':  { name: 'Novizio E/G',      icon: '⚜️', description: 'Hai cercato luoghi per E/G 5 volte',         statKey: 'searchesEG',          goal: 5,  bonusPoints: 5 },
    'esploratore_eg_10': { name: 'Esploratore',      icon: '⛺', description: 'Hai cercato luoghi per E/G 10 volte',        statKey: 'searchesEG',          goal: 10, bonusPoints: 10 },
    'esploratore_eg_15': { name: 'Mastro dei Campi', icon: '🛶', description: 'Hai cercato luoghi per E/G 15 volte',        statKey: 'searchesEG',          goal: 15, bonusPoints: 15 },
    // R/S
    'esploratore_rs_5':  { name: 'Rover Novizio',    icon: '🔥', description: 'Hai cercato luoghi per R/S 5 volte',         statKey: 'searchesRS',          goal: 5,  bonusPoints: 5 },
    'esploratore_rs_10': { name: 'Cercatore di Strade',icon: '🛤️', description: 'Hai cercato luoghi per R/S 10 volte',      statKey: 'searchesRS',          goal: 10, bonusPoints: 10 },
    'esploratore_rs_15': { name: 'Maestro di Route',  icon: '👣', description: 'Hai cercato luoghi per R/S 15 volte',        statKey: 'searchesRS',          goal: 15, bonusPoints: 15 },
    // CoCa
    'esploratore_coca_5': { name: 'Capo in Prova',    icon: '🧢', description: 'Hai cercato luoghi per CoCa 5 volte',        statKey: 'searchesCoCa',        goal: 5,  bonusPoints: 5 },
    'esploratore_coca_10':{ name: 'Capo Iniziato',    icon: '👔', description: 'Hai cercato luoghi per CoCa 10 volte',       statKey: 'searchesCoCa',        goal: 10, bonusPoints: 10 },
    'esploratore_coca_15':{ name: 'Esperto di Diari', icon: '📂', description: 'Hai cercato luoghi per CoCa 15 volte',       statKey: 'searchesCoCa',        goal: 15, bonusPoints: 15 },
    // Gruppo
    'esploratore_gru_5': { name: 'Aiuto Organizzatore',icon: '🎪', description: 'Hai cercato luoghi di Gruppo 5 volte',     statKey: 'searchesGruppo',      goal: 5,  bonusPoints: 5 },
    'esploratore_gru_10':{ name: 'Logista di Gruppo', icon: '🚚', description: 'Hai cercato luoghi di Gruppo 10 volte',    statKey: 'searchesGruppo',      goal: 10, bonusPoints: 10 },
    'esploratore_gru_15':{ name: 'Gran Maestro di Campo',icon: '🏰', description: 'Hai cercato luoghi di Gruppo 15 volte',  statKey: 'searchesGruppo',      goal: 15, bonusPoints: 15 },

    // ── Passive: Calendario ───────────────────────────────────────────────────
    'pianificatore':    { name: 'Pianificatore',    icon: '🗓️', description: 'Hai aggiunto il tuo primo evento al calendario', statKey: 'eventiAggiunti',  goal: 1,  bonusPoints: 5  },
    'calendariosta':    { name: 'Calendariosta',    icon: '📅', description: 'Hai aggiunto 5 eventi al calendario',         statKey: 'eventiAggiunti',      goal: 5,  bonusPoints: 15 },

    // ── Active: Luoghi (mantenuti) ────────────────────────────────────────────
    'piede_leggero':    { name: 'Piede Leggero',    icon: '🦶', description: 'Fai approvare 5 modifiche o nuovi luoghi',   statKey: 'contributionsApproved', goal: 5,  bonusPoints: 10 },
    'tracciatore':      { name: 'Tracciatore',      icon: '🗺️', description: 'Aggiungi 15 nuovi luoghi alla mappa',        statKey: 'locationsAdded',      goal: 15, bonusPoints: 20 },
    'sentinella':       { name: 'Sentinella',       icon: '👁️', description: 'Dai 10 conferme di validità ai luoghi',      statKey: 'validationsGiven',    goal: 10, bonusPoints: 15 },
    'rover_servizio':   { name: 'Rover di Servizio',icon: '🤝', description: 'Aggiungi 10 luoghi con servizio R/S',        statKey: 'rsLocationsAdded',    goal: 10, bonusPoints: 15 },
    'cartografo':       { name: 'Cartografo',       icon: '📍', description: 'Inserisci coordinate GPS in 10 luoghi',      statKey: 'coordinateInfoAdded', goal: 10, bonusPoints: 15 },
    
    // ── Storico Attività Badges ──────────────────────────────────────────────
    'memoria_viva':     { name: 'Memoria Viva',     icon: '📜', description: 'Hai aggiunto il tuo primo evento storico',     statKey: 'storicoItemsAdded',   goal: 1,  bonusPoints: 5 },
    'cronista_gruppo':  { name: 'Cronista Gruppo',  icon: '🖋️', description: 'Hai aggiunto 5 eventi allo storico',           statKey: 'storicoItemsAdded',   goal: 5,  bonusPoints: 10 },
    'custode_storia':   { name: 'Custode Storia',   icon: '🗝️', description: 'Hai aggiunto 15 eventi allo storico',          statKey: 'storicoItemsAdded',   goal: 15, bonusPoints: 15 },

    // ── Reviews Badges ───────────────────────────────────────────────────────
    'tracciatore_orme': { name: 'Tracciatore Orme', icon: '🐾', description: 'Hai lasciato 5 orme (recensioni) nei luoghi',  statKey: 'reviewsAdded',        goal: 5,  bonusPoints: 10 },

    // ── Inventory Badges ─────────────────────────────────────────────────────
    'primo_attrezzo':     { name: 'Logista Novizio',      icon: '📦', description: 'Aggiungi o aggiorna il tuo primo attrezzo', statKey: 'inventoryUpdates', goal: 1,  bonusPoints: 5 },
    'censore_attrezzi':   { name: 'Mastro del Magazzino', icon: '🛠️', description: 'Effettua 15 aggiornamenti di materiali o luoghi', statKey: 'inventoryUpdates', goal: 15, bonusPoints: 20 },
    'auditore_magazzino': { name: 'Ispettore di Reparto', icon: '🔍', description: 'Completa il tuo primo censimento rapido di un luogo', statKey: 'inventoryAudits', goal: 1, bonusPoints: 10 },
};

// ─── POINT ACTIONS ───────────────────────────────────────────────────────────

/** Check and award any newly unlocked badges for the user, returns bonus points given */
async function checkAndAwardBadges(user: any): Promise<number> {
    let bonus = 0;
    const newBadges: string[] = [];
    for (const [id, badge] of Object.entries(BADGES)) {
        if (user.badges.includes(id)) continue; // already earned
        const stat = (user as any)[badge.statKey] ?? 0;
        if (stat >= badge.goal) {
            user.badges.push(id);
            bonus += badge.bonusPoints;
            newBadges.push(`${badge.icon} ${badge.name}`);
        }
    }
    if (newBadges.length > 0) {
        console.info('[Gamification] Nuovi badge:', newBadges.join(', '));
    }
    return bonus;
}

export async function addPoints(amount: number) {
    try {
        const user = await getUser();
        user.points += amount;
        const bonus = await checkAndAwardBadges(user);
        user.points += bonus;
        const newLevelInfo = getLevelInfo(user.points);
        if (newLevelInfo.current.level > user.level) {
            user.level = newLevelInfo.current.level;
        }
        await updateUser(user);
    } catch (error) {
        console.error('Error adding points:', error);
    }
}

export async function addPointsToUser(userId: string, amount: number) {
    try {
        const user = await getUser(userId);
        user.points += amount;
        const bonus = await checkAndAwardBadges(user);
        user.points += bonus;
        const newLevelInfo = getLevelInfo(user.points);
        if (newLevelInfo.current.level > user.level) {
            user.level = newLevelInfo.current.level;
        }
        await updateUser(user);
    } catch (error) {
        console.error('Error adding points to user:', error);
    }
}

/**
 * Add points to the current user AND increment passive stat counters.
 * Badge checks happen automatically.
 */
export async function addPointsWithStats(
    amount: number,
    stats: {
        verbaliRead?: number;
        locationsSearched?: number;
        searchesLC?: number;
        searchesEG?: number;
        searchesRS?: number;
        searchesCoCa?: number;
        searchesGruppo?: number;
        eventiAggiunti?: number;
        contributionsApproved?: number;
        validationsGiven?: number;
        locationsAdded?: number;
        rsLocationsAdded?: number;
        pricingInfoAdded?: number;
        coordinateInfoAdded?: number;
        websiteInfoAdded?: number;
        storicoItemsAdded?: number;
        reviewsAdded?: number;
        inventoryUpdates?: number;
        inventoryAudits?: number;
        newVerbaleReadId?: string;
    } = {}
) {
    try {
        const user = await getUser();
        user.points = Math.max(0, user.points + amount);

        if (stats.verbaliRead)          user.verbaliRead          += stats.verbaliRead;
        if (stats.locationsSearched)    user.locationsSearched    += stats.locationsSearched;
        if (stats.searchesLC)           user.searchesLC           += stats.searchesLC;
        if (stats.searchesEG)           user.searchesEG           += stats.searchesEG;
        if (stats.searchesRS)           user.searchesRS           += stats.searchesRS;
        if (stats.searchesCoCa)         user.searchesCoCa         += stats.searchesCoCa;
        if (stats.searchesGruppo)       user.searchesGruppo       += stats.searchesGruppo;
        if (stats.eventiAggiunti)       user.eventiAggiunti       += stats.eventiAggiunti;
        if (stats.contributionsApproved) user.contributionsApproved += stats.contributionsApproved;
        if (stats.validationsGiven)     user.validationsGiven     += stats.validationsGiven;
        if (stats.locationsAdded)       user.locationsAdded       += stats.locationsAdded;
        if (stats.rsLocationsAdded)     user.rsLocationsAdded     += stats.rsLocationsAdded;
        if (stats.pricingInfoAdded)     user.pricingInfoAdded     += stats.pricingInfoAdded;
        if (stats.coordinateInfoAdded)  user.coordinateInfoAdded  += stats.coordinateInfoAdded;
        if (stats.websiteInfoAdded)     user.websiteInfoAdded     += stats.websiteInfoAdded;
        if (stats.storicoItemsAdded)    user.storicoItemsAdded    += stats.storicoItemsAdded;
        if (stats.reviewsAdded)        user.reviewsAdded        += stats.reviewsAdded;
        if (stats.inventoryUpdates)     user.inventoryUpdates     = (user.inventoryUpdates || 0) + stats.inventoryUpdates;
        if (stats.inventoryAudits)      user.inventoryAudits      = (user.inventoryAudits || 0) + stats.inventoryAudits;

        if (stats.newVerbaleReadId) {
            if (!user.verbaliReadIds) user.verbaliReadIds = [];
            if (!user.verbaliReadIds.includes(stats.newVerbaleReadId)) {
                user.verbaliReadIds.push(stats.newVerbaleReadId);
            }
        }

        const bonus = await checkAndAwardBadges(user);
        user.points += bonus;

        const newLevelInfo = getLevelInfo(user.points);
        if (newLevelInfo.current.level > user.level) {
            user.level = newLevelInfo.current.level;
        }

        await updateUser(user);
    } catch (error) {
        console.error('Error updating user stats/points:', error);
    }
}

/** Legacy alias for compatibility with existing code */
export async function addPointsToUserWithStats(
    userId: string,
    amount: number,
    stats: {
        contributionsApproved?: number;
        validationsGiven?: number;
        locationsAdded?: number;
        rsLocationsAdded?: number;
        pricingInfoAdded?: number;
        coordinateInfoAdded?: number;
        websiteInfoAdded?: number;
        searchesLC?: number;
        searchesEG?: number;
        searchesRS?: number;
        searchesCoCa?: number;
        searchesGruppo?: number;
        storicoItemsAdded?: number;
        reviewsAdded?: number;
    } = {}
) {
    try {
        const user = await getUser(userId);
        user.points = Math.max(0, user.points + amount);

        if (stats.contributionsApproved) user.contributionsApproved += stats.contributionsApproved;
        if (stats.validationsGiven)     user.validationsGiven     += stats.validationsGiven;
        if (stats.locationsAdded)       user.locationsAdded       += stats.locationsAdded;
        if (stats.rsLocationsAdded)     user.rsLocationsAdded     += stats.rsLocationsAdded;
        if (stats.pricingInfoAdded)     user.pricingInfoAdded     += stats.pricingInfoAdded;
        if (stats.coordinateInfoAdded)  user.coordinateInfoAdded  += stats.coordinateInfoAdded;
        if (stats.websiteInfoAdded)     user.websiteInfoAdded     += stats.websiteInfoAdded;
        if (stats.searchesLC)           user.searchesLC           += stats.searchesLC;
        if (stats.searchesEG)           user.searchesEG           += stats.searchesEG;
        if (stats.searchesRS)           user.searchesRS           += stats.searchesRS;
        if (stats.searchesCoCa)         user.searchesCoCa         += stats.searchesCoCa;
        if (stats.searchesGruppo)       user.searchesGruppo       += stats.searchesGruppo;
        if (stats.storicoItemsAdded)    user.storicoItemsAdded    += stats.storicoItemsAdded;
        if (stats.reviewsAdded)        user.reviewsAdded        += stats.reviewsAdded;

        const bonus = await checkAndAwardBadges(user);
        user.points += bonus;

        const newLevelInfo = getLevelInfo(user.points);
        if (newLevelInfo.current.level > user.level) {
            user.level = newLevelInfo.current.level;
        }

        await updateUser(user);
    } catch (error) {
        console.error('Error updating user stats/points:', error);
    }
}
