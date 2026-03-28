import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EventService } from '../../../core/services/EventService/event.service';
import { MatchService } from '../../../matches/services/match.service';
import { Event, StatutEvent } from '../event.model';
import { Match } from '../../../matches/models/match.model';

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

  matchesByEvent: Record<string, Match[]> = {};

  statutOptions = [
  { label: 'Planifié', value: StatutEvent.PLANNED },
  { label: 'En cours', value: StatutEvent.ONGOING },
  { label: 'Terminé',  value: StatutEvent.FINISHED },
  { label: 'Annulé',   value: StatutEvent.CANCELLED },
];

  constructor(
    private eventService: EventService,
    private matchService: MatchService
  ) {}

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
    return this.filteredEvents.filter(e => e.statutEvent === StatutEvent.PLANNED).length;
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.eventService.getAll().subscribe({
      next: (data) => {
        this.events = data;
        this.applyFilters();
        this.loadMatchesForEvents(data);
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'Erreur lors du chargement des événements.';
        this.isLoading = false;
      }
    });
  }

  // ── Charger les matches pour chaque event qui en a 
  loadMatchesForEvents(events: Event[]): void {
    // on ne charge que les events avec teamIds (Friendly Match)
    const friendlyEvents = events.filter(
      e => !e.isCompetition && e.teamIds && e.teamIds.length > 0
    );

    if (friendlyEvents.length === 0) return;

    // Pour chaque event, chercher les matches par terrainId
    friendlyEvents.forEach(ev => {
      if (!ev.terrainId) return;

      this.matchService.filterByTerrain(ev.terrainId).pipe(
        catchError(() => of([]))
      ).subscribe(matches => {
        // filtrer les matches qui correspondent à la date de l'event
        this.matchesByEvent[ev.id] = matches.filter(m =>
          m.dateDebut.startsWith(ev.startDate)
        );
      });
    });
  }
  getMatchesForEvent(eventId: string): Match[] {
    return this.matchesByEvent[eventId] || [];
  }

  getMatchTime(match: Match): string {
    if (!match.dateDebut) return '--:--';
    return new Date(match.dateDebut).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    });
  }
  isMatchLive(match: Match): boolean {
    return match.statut === 'EN_COURS';
  }

  applyFilters(): void {
    if (this.selectedStatut) {
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

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      PLANNED:   'badge-planifie',
      ONGOING:   'badge-en_cours',
      FINISHED:  'badge-termine',
      CANCELLED: 'badge-annule',
    };
    return map[statut] ?? '';
  }
}