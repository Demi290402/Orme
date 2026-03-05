import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const getStalenessInfo = (updatedAt: string) => {
    const lastUpdate = new Date(updatedAt);
    const now = new Date();
    const diffYears = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    if (diffYears < 1) return { level: 0, color: 'bg-green-500', label: 'Recente', bgLight: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' };
    if (diffYears < 2) return { level: 1, color: 'bg-yellow-500', label: 'Da verificare', bgLight: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' };
    if (diffYears < 3) return { level: 2, color: 'bg-orange-500', label: 'Potrebbe essere cambiato', bgLight: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' };
    return { level: 3, color: 'bg-red-500', label: 'Datato', bgLight: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
};

const DEFAULT_COVERS = [
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560', // Forest
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2560', // Mountains
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=2560', // Camping/Nature
    'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?q=80&w=2560', // Alpine
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2560'  // Landscape
];

export const getDefaultCover = (userId: string) => {
    // Simple deterministic selection based on userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % DEFAULT_COVERS.length;
    return DEFAULT_COVERS[index];
};
