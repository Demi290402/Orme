import { Location, User } from '@/types';

// Start with empty arrays for production - users will register themselves
export const MOCK_USERS: User[] = [];

export const MOCK_LOCATIONS: Location[] = [];


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

export function loginUser(email: string, password: string): User | null {
    const stored = localStorage.getItem('orme_users');
    const users: User[] = stored ? JSON.parse(stored) : [];

    const user = users.find(u => u.email === email && u.password === password);

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

    // No user logged in - throw error to trigger auth redirect
    throw new Error('No user logged in');
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
