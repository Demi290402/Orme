export interface User {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string;
    email: string;
    password: string;
    profilePicture?: string;
    coverImage?: string;
    scoutCode?: string; // Codice Socio
    points: number;
    level: number;
    badges: string[]; // Badge IDs
    locationsAdded: number;
    contributionsApproved: number;
    validationsGiven: number; // New: for "sentinella" badge
    rsLocationsAdded: number; // New: for "rover_servizio" badge
    pricingInfoAdded: number; // New: for "economo" badge
    coordinateInfoAdded: number; // New: for "cartografo" badge
    websiteInfoAdded: number; // New: for "informatore" badge
}

export type Restriction =
    | 'Acqua non potabile'
    | 'No fuochi'
    | 'No tende'
    | 'No riscaldamento'
    | 'Gestore invadente'
    | 'Acqua ed elettricità limitate'
    | 'Altro';

export interface PricingInfo {
    basePrice: number;
    unit: 'per_night' | 'per_day';
    description: string; // Explanations for kitchen use, partial days, etc.
}

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
    province: string;
    commune: string;
    address?: string;
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
    hasEquippedKitchen: boolean; // Renamed from hasCookware
    hasPoles: boolean;

    // Attenzioni (Precautions)
    hasPastures?: boolean;
    hasInsects?: boolean;
    hasDiseases?: boolean;
    hasLittleShade?: boolean;
    hasVeryBusyArea?: boolean;
    otherAttention?: string;

    otherLogistics?: string;
    roverServiceDescription?: string;
    restrictions: Restriction[];
    otherRestrictions?: string;
    website?: string;
    email?: string;
    description?: string;
    pricing?: PricingInfo; // New field
    googleMapsLink?: string;

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
    rejections: string[]; // User IDs who rejected
    status: 'pending' | 'approved' | 'rejected' | 'superseded';
}
