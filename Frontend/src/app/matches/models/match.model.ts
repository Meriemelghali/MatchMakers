export interface Match {
    id?: string;
    titre: string;
    equipe1: string;
    equipe2: string;
    scoreEquipe1: number;
    scoreEquipe2: number;
    dateDebut: string;
    dateFin: string;
    statut: MatchStatus;
    type: MatchType;
    arbitre?: string;
    description?: string;
    capaciteSpectateurs?: number;
    terrainId?: string;
    evenements?: MatchEvent[];
    createdAt?: string;
    updatedAt?: string;
}

export interface MatchEvent {
    id?: string;
    type: EventType;
    minute: number;
    joueur?: string;
    equipe?: string;
    description?: string;
    createdAt?: string;
}

export type MatchStatus = 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'ANNULE' | 'REPORTE';
export type MatchType = 'AMICAL' | 'CHAMPIONNAT' | 'COUPE' | 'TOURNOI';
export type EventType = 'BUT' | 'CARTON_JAUNE' | 'CARTON_ROUGE' | 'REMPLACEMENT' | 'ARRET' | 'HORS_JEU' | 'PENALTY' | 'DEBUT_MI_TEMPS' | 'FIN_MI_TEMPS';
