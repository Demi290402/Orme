import { Location, User } from '@/types';

export const MOCK_USERS: User[] = [
    {
        id: 'u1',
        firstName: 'Demi',
        lastName: 'Cistulli',
        nickname: 'Capo Turi',
        email: 'demi@turi1.it',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demi',
        coverImage: 'https://images.unsplash.com/photo-1517173772233-1c39023be6a1?q=80&w=2000&auto=format&fit=crop',
        scoutCode: '123456',
        points: 120,
        level: 2,
        badges: ['piede_leggero'],
        locationsAdded: 6,
        contributionsApproved: 4
    }
];

export const MOCK_LOCATIONS: Location[] = [
    {
        id: 'l1',
        name: 'Base Scout "Il Ruscello"',
        region: 'Calabria',
        commune: 'Linguaglossa',
        contacts: [{ type: 'phone', value: '3331234567', name: 'Custode' }],
        activities: ['Campo estivo', 'Caccia primaverile'],
        quickNote: 'Ottima per branchi, acqua potabile presente.',
        hasTents: true,
        hasRefectory: true,
        hasRoverService: false,
        hasChurch: true,
        hasGreenSpace: true,
        hasCookware: false,
        hasPoles: true,
        restrictions: ['No fuochi'],
        lastUpdatedAt: '2025-06-15T12:00:00Z',
        lastUpdatedBy: 'u1'
    },
    {
        id: 'l2',
        name: 'Rifugio Montano Sila',
        region: 'Calabria',
        commune: 'Camigliatello',
        contacts: [{ type: 'whatsapp', value: '3339876543' }],
        activities: ['Route invernale', 'Pernotto comunità capi'],
        quickNote: 'Freddo d\'inverno, stufa a legna.',
        hasTents: false,
        hasRefectory: true,
        hasRoverService: true,
        roverServiceDescription: 'Possibilità di servizio in cucina.',
        hasChurch: false,
        hasGreenSpace: true,
        hasCookware: true,
        hasPoles: true,
        restrictions: ['Acqua non potabile'],
        lastUpdatedAt: '2024-12-10T10:30:00Z',
        lastUpdatedBy: 'u1'
    }
];

export function getLocations(): Location[] {
    const stored = localStorage.getItem('orme_locations');
    if (stored) return JSON.parse(stored);

    // Initialize if empty
    localStorage.setItem('orme_locations', JSON.stringify(MOCK_LOCATIONS));
    return MOCK_LOCATIONS;
}

export function addLocation(location: Omit<Location, 'id' | 'lastUpdatedAt' | 'lastUpdatedBy'>) {
    const locations = getLocations();
    const currentUser = getUser();
    const newLocation: Location = {
        ...location,
        id: Math.random().toString(36).substr(2, 9),
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: currentUser?.id || 'u1'
    };
    locations.push(newLocation);
    localStorage.setItem('orme_locations', JSON.stringify(locations));
    return newLocation;
}

// User Management

export function registerUser(userData: Omit<User, 'id' | 'points' | 'level' | 'badges' | 'locationsAdded' | 'contributionsApproved'>): User {
    const stored = localStorage.getItem('orme_users');
    const users: User[] = stored ? JSON.parse(stored) : [...MOCK_USERS]; // Initialize with mocks if empty

    // Check if email already exists
    if (users.some(u => u.email === userData.email)) {
        throw new Error('Email già registrata');
    }

    const newUser: User = {
        ...userData,
        id: Math.random().toString(36).substr(2, 9),
        points: 0,
        level: 1,
        badges: [],
        locationsAdded: 0,
        contributionsApproved: 0
    };

    users.push(newUser);
    localStorage.setItem('orme_users', JSON.stringify(users));

    // Auto login after register
    localStorage.setItem('orme_current_user', JSON.stringify(newUser));

    return newUser;
}

export function loginUser(email: string): User | null {
    const stored = localStorage.getItem('orme_users');
    const users: User[] = stored ? JSON.parse(stored) : [...MOCK_USERS];

    const user = users.find(u => u.email === email);

    if (user) {
        localStorage.setItem('orme_current_user', JSON.stringify(user));
        return user;
    }

    return null;
}

export function logoutUser() {
    localStorage.removeItem('orme_current_user');
}

export function getUser(id?: string): User {
    // If specific ID requested (e.g. for display), try to find it
    if (id) {
        const stored = localStorage.getItem('orme_users');
        const users = stored ? JSON.parse(stored) : MOCK_USERS;
        const found = users.find((u: User) => u.id === id);
        if (found) return found;
    }

    // Otherwise return currently logged in user
    const currentStored = localStorage.getItem('orme_current_user');
    if (currentStored) {
        return JSON.parse(currentStored);
    }

    // Fallback to first mock user if nothing else (for dev/demo consistency if storage cleared)
    // In a real app this would return null and force redirect
    return MOCK_USERS[0];
}

export function updateUser(updatedUser: User) {
    const stored = localStorage.getItem('orme_users');
    let users = stored ? JSON.parse(stored) : [...MOCK_USERS];

    const index = users.findIndex((u: User) => u.id === updatedUser.id);
    if (index !== -1) {
        users[index] = updatedUser;
        localStorage.setItem('orme_users', JSON.stringify(users));

        // Also update current user if it's the one being updated
        const currentUser = getUser();
        if (currentUser.id === updatedUser.id) {
            localStorage.setItem('orme_current_user', JSON.stringify(updatedUser));
        }
    }
}
