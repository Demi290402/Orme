export interface User {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string;
    email: string;
    profilePicture?: string;
    coverImage?: string;
    scoutCode?: string; // Codice Socio
    points: number;
    level: number;
    badges: string[]; // Badge IDs
    locationsAdded: number;
    contributionsApproved: number;
}

export type Restriction =
    | 'Acqua non potabile'
    | 'No fuochi'
    | 'No tende'
    | 'No animali'
    | 'Altro';

export type ActivityType =
    | 'Caccia invernale'
    | 'Caccia primaverile'
    | 'Caccia giungla'
    | 'Caccia di Accettazione'
    | 'Vacanze di Branco'
    | 'Campo invernale'
    | 'Campo primaverile'
    | 'San Giorgio'
    | 'Campo estivo'
    | 'Route invernale'
    | 'Route primaverile'
    | 'Route estiva'
    | 'Pernotto comunità capi'
    | 'Uscita di apertura'
    | 'Campo di gruppo';

export interface LocationContact {
    type: 'phone' | 'whatsapp' | 'email';
    value: string;
    name?: string;
}

export interface Location {
    id: string;
    name: string;
    region: string;
    commune: string;
    contacts: LocationContact[];
    activities: ActivityType[];
    quickNote: string;

    // Optional
    coordinates?: { lat: number; lng: number };
    beds?: number;
    bathrooms?: number;
    hasTents: boolean;
    hasRefectory: boolean;
    hasRoverService: boolean;
    hasChurch: boolean;
    hasGreenSpace: boolean;
    hasCookware: boolean;
    hasPoles: boolean;

    otherLogistics?: string;
    roverServiceDescription?: string;
    restrictions: Restriction[];
    otherRestrictions?: string;
    website?: string;
    email?: string;
    description?: string;

    // Metadata
    lastUpdatedAt: string; // ISODate
    lastUpdatedBy: string; // User ID or Nickname
}

export interface Proposal {
    id: string;
    type: 'update' | 'delete';
    locationId: string;
    locationName: string; // Snapshot for delete display
    proposerId: string;
    timestamp: string;
    changes?: Partial<Location>; // Optional for delete
    approvals: string[]; // User IDs who approved
    status: 'pending' | 'approved' | 'rejected' | 'superseded';
}
