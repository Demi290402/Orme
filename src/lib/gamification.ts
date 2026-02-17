import { getUser, updateUser } from './data';

export const LEVELS = [
    { level: 1, name: 'Piede Tenero', min: 0, max: 49 },
    { level: 2, name: 'Capo Sestiglia', min: 50, max: 149 },
    { level: 3, name: 'Esploratore/Guida', min: 150, max: 274 },
    { level: 4, name: 'Giovane Capo', min: 275, max: 399 },
    { level: 5, name: 'Sentinella', min: 400, max: 599 },
    { level: 6, name: 'Capo Brevettato', min: 600, max: Infinity },
];

export function getLevelInfo(points: number) {
    // Handle cases where points might exceed the defined ranges (though max: Infinity covers it)
    const current = LEVELS.find(l => points >= l.min && points <= l.max) || LEVELS[LEVELS.length - 1];
    const next = LEVELS.find(l => l.level === current.level + 1);

    return {
        current,
        next,
        pointsToNext: next ? next.min - points : 0
    };
}

export const BADGES = {
    'piede_leggero': { name: 'Piede Leggero', description: 'Fai approvare 5 modifiche o nuovi luoghi', icon: '🦶', goal: 5, statKey: 'contributionsApproved' },
    'tracciatore': { name: 'Tracciatore', description: 'Aggiungi 15 nuovi luoghi alla mappa', icon: '🗺️', goal: 15, statKey: 'locationsAdded' },
    'sentinella': { name: 'Sentinella', description: 'Dai 10 conferme di validità ai luoghi', icon: '👁️', goal: 10, statKey: 'validationsGiven' },
    'rover_servizio': { name: 'Rover di Servizio', description: 'Aggiungi 10 luoghi che offrono servizio RS', icon: '🤝', goal: 10, statKey: 'rsLocationsAdded' },
    'economo': { name: 'Economo', description: 'Inserisci info sui prezzi in 5 luoghi', icon: '💰', goal: 5, statKey: 'pricingInfoAdded' },
    'cartografo': { name: 'Cartografo', description: 'Inserisci via o posizione GPS in 10 luoghi', icon: '📍', goal: 10, statKey: 'coordinateInfoAdded' },
    'informatore': { name: 'Informatore', description: 'Inserisci il link al sito web in 10 luoghi', icon: '🌐', goal: 10, statKey: 'websiteInfoAdded' }
};

export async function addPoints(amount: number) {
    try {
        const user = await getUser();
        user.points += amount;

        // Check for level up
        const newLevelInfo = getLevelInfo(user.points);
        if (newLevelInfo.current.level > user.level) {
            user.level = newLevelInfo.current.level;
            alert(`Complimenti! Sei salito al livello ${newLevelInfo.current.name}! 🎉`);
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

        // Check for level up
        const newLevelInfo = getLevelInfo(user.points);
        if (newLevelInfo.current.level > user.level) {
            user.level = newLevelInfo.current.level;
            // No alert for other users' level up to avoid UI confusion
        }

        await updateUser(user);
    } catch (error) {
        console.error('Error adding points to user:', error);
    }
}
