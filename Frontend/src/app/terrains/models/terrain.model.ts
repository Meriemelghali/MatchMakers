export interface Terrain {
    id?: string;
    nom: string;
    adresse: string;
    ville: string;
    latitude?: number;
    longitude?: number;
    typeSport: SportType;
    typeSurface: SurfaceType;
    statut: TerrainStatus;
    capacite?: number;
    description?: string;
    contact?: string;
    prixParHeure?: number;
    photos?: string[];
    eclairage: boolean;
    vestiaires: boolean;
    parking: boolean;
    tribunes: boolean;
    bar: boolean;
    creneaux?: TimeSlot[];
    createdAt?: string;
    updatedAt?: string;
}

export interface TimeSlot {
    jour: string;
    heureOuverture: string;
    heureFermeture: string;
    actif: boolean;
}

export interface Reservation {
    id?: string;
    terrainId: string;
    organisateurId: number;
    dateDebut: string;
    dateFin: string;
    statut: ReservationStatus;
    prixTotal?: number;
    notes?: string;
    matchId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type TerrainStatus = 'DISPONIBLE' | 'OCCUPE' | 'MAINTENANCE' | 'FERME';
export type SportType = 'FOOTBALL' | 'BASKETBALL' | 'TENNIS' | 'VOLLEYBALL' | 'FUTSAL' | 'PADEL' | 'RUGBY' | 'HANDBALL';
export type SurfaceType = 'GAZON_NATUREL' | 'GAZON_SYNTHETIQUE' | 'PARQUET' | 'BETON' | 'TERRE_BATTUE' | 'TARTAN';
export type ReservationStatus = 'EN_ATTENTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE';
