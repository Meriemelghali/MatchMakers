import { Component, OnInit, OnDestroy } from '@angular/core';
import { EventService } from '../../../core/services/EventService/event.service';
import { Event, StatutEvent } from '../event.model';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css']
})
export class EventListComponent implements OnInit, OnDestroy {
  currentTime = '';
  private timer: any;

  events: Event[] = [];
  filteredEvents: Event[] = [];
  isLoading = false;
  errorMsg = '';

  selectedStatut = '';
  selectedType = '';

  statutOptions = [
  { label: 'Planifié', value: StatutEvent.PLANNED },
  { label: 'En cours', value: StatutEvent.ONGOING },
  { label: 'Terminé',  value: StatutEvent.FINISHED },
  { label: 'Annulé',   value: StatutEvent.CANCELLED },
];

  friendlyMatches = [
    { name: 'Match 1', sub: 'Match 1', teamA: 'Team A', teamB: 'Team B', time: '15:00' },
    { name: 'Match 2', sub: 'Match 2', teamA: 'Team A', teamB: 'Team B', time: '12:55' },
    { name: 'Match 3', sub: 'Match 3', teamA: 'Team A', teamB: 'Team B', time: '13:59' },
  ];

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.updateTime();
    this.timer = setInterval(() => this.updateTime(), 1000);
    this.loadEvents();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  updateTime(): void {
    this.currentTime = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  get planifiesCount(): number {
    return this.filteredEvents.filter(e => e.statut === StatutEvent.PLANNED).length;
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.eventService.getAll().subscribe({
      next: (data) => {
        this.events = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'Erreur lors du chargement des événements.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
  if (this.selectedStatut) {
    // ✅ appel backend avec le statut
    this.isLoading = true;
    this.eventService.getByStatut(this.selectedStatut as StatutEvent).subscribe({
      next: (data) => {
        this.filteredEvents = this.filterByType(data);
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'Erreur lors du filtrage.';
        this.isLoading = false;
      }
    });
  } else {
    // pas de filtre statut → filtre local sur les données déjà chargées
    this.filteredEvents = this.filterByType(this.events);
  }
}
filterByType(data: Event[]): Event[] {
  if (!this.selectedType) return data;
  return data.filter(e =>
    this.selectedType === 'COMPETITION' ? !!e.competition : !e.competition
  );
}

  resetFilters(): void {
    this.selectedStatut = '';
    this.selectedType = '';
    this.applyFilters();
  }

  deleteEvent(id: string): void {
    if (!confirm('Supprimer cet événement ?')) return;
    this.eventService.delete(id).subscribe({
      next: () => this.loadEvents(),
      error: () => alert('Erreur lors de la suppression.')
    });
  }

  getStatutClass(statut: StatutEvent): string {
    const map: Record<string, string> = {
      PLANNED: 'badge-planifie',
      ONGOING: 'badge-en_cours',
      FINISHED: 'badge-termine',
      CANCELLED: 'badge-annule',
    };
    return map[statut] ?? '';
  }
}