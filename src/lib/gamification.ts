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
    // ── Passive: Ricerca luoghi ───────────────────────────────────────────────
    'prima_traccia':    { name: 'Prima Traccia',    icon: '🐾', description: 'Hai cercato un luogo per la prima volta',     statKey: 'locationsSearched',   goal: 1,  bonusPoints: 5  },
    'esploratore_lc':   { name: 'Esploratore L/C',  icon: '🐺', description: 'Hai cercato luoghi per L/C 5 volte',         statKey: 'locationsSearched',   goal: 5,  bonusPoints: 10 },
    'esploratore_eg':   { name: 'Esploratore E/G',  icon: '⚜️', description: 'Hai cercato luoghi per E/G 10 volte',        statKey: 'locationsSearched',   goal: 10, bonusPoints: 10 },
    'esploratore_rs':   { name: 'Esploratore R/S',  icon: '🔥', description: 'Hai cercato luoghi per R/S 15 volte',        statKey: 'locationsSearched',   goal: 15, bonusPoints: 10 },
    // ── Passive: Calendario ───────────────────────────────────────────────────
    'pianificatore':    { name: 'Pianificatore',    icon: '🗓️', description: 'Hai aggiunto il tuo primo evento al calendario', statKey: 'eventiAggiunti',  goal: 1,  bonusPoints: 5  },
    'calendariosta':    { name: 'Calendariosta',    icon: '📅', description: 'Hai aggiunto 5 eventi al calendario',         statKey: 'eventiAggiunti',      goal: 5,  bonusPoints: 15 },
    // ── Active: Luoghi (mantenuti) ────────────────────────────────────────────
    'piede_leggero':    { name: 'Piede Leggero',    icon: '🦶', description: 'Fai approvare 5 modifiche o nuovi luoghi',   statKey: 'contributionsApproved', goal: 5,  bonusPoints: 10 },
    'tracciatore':      { name: 'Tracciatore',      icon: '🗺️', description: 'Aggiungi 15 nuovi luoghi alla mappa',        statKey: 'locationsAdded',      goal: 15, bonusPoints: 20 },
    'sentinella':       { name: 'Sentinella',       icon: '👁️', description: 'Dai 10 conferme di validità ai luoghi',      statKey: 'validationsGiven',    goal: 10, bonusPoints: 15 },
    'rover_servizio':   { name: 'Rover di Servizio',icon: '🤝', description: 'Aggiungi 10 luoghi con servizio R/S',        statKey: 'rsLocationsAdded',    goal: 10, bonusPoints: 15 },
    'cartografo':       { name: 'Cartografo',       icon: '📍', description: 'Inserisci coordinate GPS in 10 luoghi',      statKey: 'coordinateInfoAdded', goal: 10, bonusPoints: 15 },
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
        eventiAggiunti?: number;
        contributionsApproved?: number;
        validationsGiven?: number;
        locationsAdded?: number;
        rsLocationsAdded?: number;
        pricingInfoAdded?: number;
        coordinateInfoAdded?: number;
        websiteInfoAdded?: number;
    } = {}
) {
    try {
        const user = await getUser();
        user.points = Math.max(0, user.points + amount);

        if (stats.verbaliRead)          user.verbaliRead          += stats.verbaliRead;
        if (stats.locationsSearched)    user.locationsSearched    += stats.locationsSearched;
        if (stats.eventiAggiunti)       user.eventiAggiunti       += stats.eventiAggiunti;
        if (stats.contributionsApproved) user.contributionsApproved += stats.contributionsApproved;
        if (stats.validationsGiven)     user.validationsGiven     += stats.validationsGiven;
        if (stats.locationsAdded)       user.locationsAdded       += stats.locationsAdded;
        if (stats.rsLocationsAdded)     user.rsLocationsAdded     += stats.rsLocationsAdded;
        if (stats.pricingInfoAdded)     user.pricingInfoAdded     += stats.pricingInfoAdded;
        if (stats.coordinateInfoAdded)  user.coordinateInfoAdded  += stats.coordinateInfoAdded;
        if (stats.websiteInfoAdded)     user.websiteInfoAdded     += stats.websiteInfoAdded;

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
