export interface Event {
  id: string;
  name: string;
  description?: string;
  sportId?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  organizerId?: string;
  statut: StatutEvent;
  competition?: any;
}

export enum StatutEvent {
  PLANNED = 'PLANNED',
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED'
}