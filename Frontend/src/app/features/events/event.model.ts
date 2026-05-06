export interface EventType {
  id: string;
  typeName: string;
  icon?: string;
  description?: string;
  defaultRules?: string[];
  isCompetition: boolean;
  requiresTeams: boolean;
  requiresMatches: boolean;
}
export interface Competition {
  id: string;
  nameCompetition: string;
  maxTeam: number;
  teamIds: string[];
  matchIds: string[];
  format: CompetitionFormat;
  status: CompetitionStatus;
}
export interface Event {
  id: string;
  name: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  statutEvent: StatutEvent;
  createdBy?: { id: string; name: string };
  createdAt?: string;
  sportId?: string;
  clubId?: string;
  terrainId?: string;
  teamIds?: string[];
  eventType?: EventType;
  competition?: Competition;
  eventTypeName?: string;
  isCompetition?: boolean;
  competitionId?: string;
  competitionName?: string;
  participantIds?: string[];
  
  // Route fields
  startPoint?: string;
  endPoint?: string;
  distances?: number[];
  routePath?: { lat: number, lng: number }[];
}
export interface CreateEventRequest {
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  sportId: string;
  clubId?: string;
  terrainId?: string;
  eventTypeId: string;
  createdBy?: string;
  competitionName?: string;
  maxTeam?: number;
  format?: CompetitionFormat;
  teamIds?: string[];
  participantIds?: string[];

  // Route fields
  startPoint?: string;
  endPoint?: string;
  distances?: number[];
  routePath?: { lat: number, lng: number }[];
}
export interface UpdateEventRequest {
  name?: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  terrainId?: string;
  statutEvent?: StatutEvent;
  teamIds?: string[];
  participantIds?: string[];
  competitionName?: string;
  maxTeam?: number;
  format?: CompetitionFormat;

  // Route fields
  startPoint?: string;
  endPoint?: string;
  distances?: number[];
  routePath?: { lat: number, lng: number }[];
}
export enum StatutEvent {
  PLANNED = 'PLANNED',
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED'
}
export enum CompetitionFormat {
  LEAGUE     = 'LEAGUE',
  KNOCKOUT   = 'KNOCKOUT',
  TOURNAMENT = 'TOURNAMENT',
  FRIENDLY   = 'FRIENDLY'
}

export enum CompetitionStatus {
  PENDING  = 'PENDING',
  ONGOING  = 'ONGOING',
  FINISHED = 'FINISHED'
}