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
    'piede_leggero': { name: 'Piede Leggero', description: '5 contributi approvati', icon: '🦶' },
    'tracciatore': { name: 'Tracciatore', description: '15 contributi', icon: '🗺️' },
    'cartografo': { name: 'Cartografo', description: '30 contributi', icon: '📍' },
    'sentinella': { name: 'Sentinella', description: '10 conferme validità', icon: '👁️' },
    'rover_servizio': { name: 'Rover di Servizio', description: '10 luoghi con servizio RS', icon: '🤝' }
};

export function addPoints(amount: number) {
    const user = getUser();
    user.points += amount;

    // Check for level up
    const newLevelInfo = getLevelInfo(user.points);
    if (newLevelInfo.current.level > user.level) {
        user.level = newLevelInfo.current.level;
        alert(`Complimenti! Sei salito al livello ${newLevelInfo.current.name}! 🎉`);
    }

    updateUser(user);
}
