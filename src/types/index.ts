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
    validationsGiven: number;
    rsLocationsAdded: number;
    pricingInfoAdded: number;
    coordinateInfoAdded: number;
    websiteInfoAdded: number;
    
    // Multi-tenancy
    region?: string;
    scoutZone?: string;
    groupName?: string;
    groupId?: string;
}

export interface MembroCoCa {
    id: string;
    groupId: string;
    nome: string;
    branca?: string;
    ruoli: string[];
    userId?: string;
}

export interface Ospite {
    nome: string;
    ruolo?: string;
}

export interface PuntoODG {
    id: string;
    titolo: string;
    contenuto: string;
    note?: string;
}

export interface CassaMovimento {
    id: string;
    branca: string;
    tipo: 'Versamento' | 'Ricevuta';
    importo: number;
    note: string;
}

export interface RitornoCoCa {
    id?: string;
    branca: string;
    tipo?: 'Branca' | 'Membro';
    contenuto: string;
}

export interface PostoAzione {
    id: string;
    chi: string;
    cosa: string;
    quando: string;
}

export interface DataImportante {
    id: string;
    dataInizio: string;
    dataFine?: string;
    evento: string;
    branca: string;
    luogo?: string;
    note?: string;
}

export interface Verbale {
    id: string;
    groupId: string;
    numero: number;
    titolo: string;
    data: string;
    luogo: string;
    oraInizio: string;
    oraFine: string;
    presenti: string[]; // IDs di MembroCoCa
    assenti: string[];
    ritardi: string[]; // IDs di MembroCoCa
    usciteAnticipate: { membroId: string; ora: string }[];
    ospiti: Ospite[];
    odg: PuntoODG[];
    cassa: CassaMovimento[];
    ritorni: RitornoCoCa[];
    dateImportanti: DataImportante[];
    postiAzione: PostoAzione[];
    prossimiImpegni: DataImportante[];
    varie: string;
    sezioniAttive: string[];
    createdAt: string;
    createdBy: string; // User ID
    createdByName?: string; // User Nickname or Name
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
