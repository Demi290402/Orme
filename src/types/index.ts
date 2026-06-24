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
    // Passive gamification counters
    verbaliRead: number;
    locationsSearched: number;
    eventiAggiunti: number;
    searchesLC: number;
    searchesEG: number;
    searchesRS: number;
    searchesCoCa: number;
    searchesGruppo: number;
    verbaliReadIds: string[];
    storicoItemsAdded: number;
    reviewsAdded: number;
    // Inventory Gamification
    inventoryUpdates?: number;
    inventoryAudits?: number;
    // Multi-tenancy
    region?: string;
    scoutZone?: string;
    groupName?: string;
    groupId?: string;
    
    // Storico Formazione
    formazione?: CorsoFormazione[];
    hasNominaCapo?: boolean;
}

export type TipoCorso = 'CFT' | 'CFM LC' | 'CFM EG' | 'CFM RS' | 'CFA' | 'Campo Bibbia' | 'CAM LC' | 'CAM EG' | 'CAM RS';

export interface CorsoFormazione {
    corso: TipoCorso;
    anno: number;
    mese?: number; // facoltativo
}

export interface MembroCoCa {
    id: string;
    groupId: string;
    nome: string;
    branca: string;
    brancheSecondarie?: string[]; // additional branche (e.g. ['CoCa'] for CG serving in branca)
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
    chiIds: string[];  // IDs of MembroCoCa assigned to this task
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
    updatedAt?: string;
    lastModifiedBy?: string; // User ID
    lastModifiedByUsername?: string; // Username for display
}

export type Restriction =
    | 'Acqua non potabile'
    | 'No fuochi di bivacco'
    | 'No tende'
    | 'No riscaldamento'
    | 'Accesso difficile veicoli'
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

export interface LocationReview {
    id: string;
    locationId: string;
    userId: string;
    userNickname?: string;
    userProfilePicture?: string;
    
    // Ratings (1-5, null if skipped)
    ombra?: number;
    acquaPotabile?: boolean;
    legna?: number;
    fuochi?: boolean;
    suolo?: number;
    servizi?: number;
    prezzo?: number;
    sicurezza?: number;
    isolamento?: number;
    
    commento?: string;
    createdAt: string;
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

    // Aggregate Ratings & Stats
    avgRating: number;
    reviewsCount: number;
    priceCategory: number; // 0: N/D, 1: €, 2: €€, 3: €€€

    // Metadata
    lastUpdatedAt: string; // ISODate
    lastUpdatedBy: string; // User ID or Nickname
    availabilityStatus: 'available' | 'maintenance' | 'closed';
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

export interface InventarioLuogo {
    id: string;
    groupId: string;
    name: string;
    description?: string;
    color: string;
    icon: string;
    createdAt?: string;
    updatedAt?: string;
}

export type AttrezzoStatus = 'disponibile' | 'danneggiato' | 'in_manutenzione' | 'perso';

export interface InventarioAttrezzo {
    id: string;
    groupId: string;
    name: string;
    category: string; // e.g. Pioneering, Camping, Kitchen, Safety, Stationery, etc.
    description?: string;
    tags: string[];
    status: AttrezzoStatus;
    luogoId: string | null; // references InventarioLuogo.id
    imageUrl?: string;
    quantity: number;
    isDangerous: boolean;
    isConsumable: boolean;
    lastCheckedAt?: string;
    lastCheckedBy?: string; // User UUID
    createdAt?: string;
    updatedAt?: string;
}

export interface EventoAttrezzoRelation {
    eventoId: string;
    attrezzoId: string;
    quantity: number;
    checkedOut: boolean;
    checkedIn: boolean;
    attrezzo?: InventarioAttrezzo;
}

export type BrancaType = 'L/C' | 'E/G' | 'R/S' | 'Gruppo' | 'CoCa';

export interface BilancioMovimento {
    id: string;
    groupId: string;
    titolo: string;
    importo: number;
    tipo: 'entrata' | 'uscita';
    branca: BrancaType;
    categoria?: string;
    data: string; // YYYY-MM-DD
    note?: string;
    createdBy?: string;
    createdAt?: string;
}

export interface ListaAttesa {
    id: string;
    groupId: string;
    nomeGenitore: string;
    telefonoGenitore: string;
    nomeRagazzo: string;
    cognomeRagazzo: string;
    dataNascita: string; // YYYY-MM-DD
    classe: string;
    dataIscrizione: string; // YYYY-MM-DD
    note?: string;
    createdAt?: string;
}

export interface ImpostazioniIscrizione {
    groupId: string;
    formTitle: string;
    welcomeTitle: string;
    descriptionText: string;
    footerText: string;
    bannerUrl: string;
    successTitle: string;
    successMessage: string;
    disclaimerText: string;
    createdAt?: string;
}

export interface ServizioTrasporto {
    id: string;
    groupId: string;
    companyName: string;
    contactName?: string;
    phone?: string;
    email?: string;
    departureRegion: string;
    departureProvince?: string;
    departureCommune: string;
    departureAddress?: string;
    capacity: number;
    pricePerPerson?: number;
    basePrice?: number; // Preventivo
    km?: number;
    numeroPersone?: number;
    notes?: string;
    createdAt?: string;
}
