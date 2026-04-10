import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EventService } from '../../events/service/event.service';
import { MatchService } from '../../../matches/services/match.service';
import { Event, StatutEvent } from '../event.model';
import { Match } from '../../../matches/models/match.model';
import { TeamService } from '../../teams/services/team.service';
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { UserManagementService, User } from '../../../core/services/UserService/user-management.service';

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
  editingStatusId: string | null = null; // Used for identifying which event's menu is open
  selectedEventForModal: Event | null = null;

  matchesByEvent: Record<string, Match[]> = {};
  teamNames: Record<string, string> = {}; // id -> name map
  userNames: Record<string, string> = {}; // userId -> fullName map

  statutOptions = [
    { label: 'Planned', value: StatutEvent.PLANNED },
    { label: 'Ongoing', value: StatutEvent.ONGOING },
    { label: 'Finished',  value: StatutEvent.FINISHED },
    { label: 'Cancelled',   value: StatutEvent.CANCELLED },
  ];

  constructor(
    private eventService: EventService,
    private matchService: MatchService,
    private teamService: TeamService,
    private authService: AuthService,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    this.updateTime();
    this.timer = setInterval(() => this.updateTime(), 1000);
    this.loadTeams();
    this.loadUsers();
    this.loadEvents();
    
    // Close menu when clicking outside
    document.addEventListener('click', () => {
      this.editingStatusId = null;
    });
  }

  loadTeams(): void {
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        console.log('Teams loaded:', teams);
        teams.forEach(t => {
          // Check for both id and _id just in case
          const id = t.id || (t as any)._id;
          if (id) {
            this.teamNames[id] = t.name;
          }
        });
        console.log('Team Names Mapping:', this.teamNames);
      },
      error: () => console.warn('Erreur lors du chargement des équipes')
    });
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        users.forEach(u => {
          this.userNames[u.idUser] = `${u.firstName} ${u.lastName}`.trim();
        });
      },
      error: () => console.warn('Erreur lors du chargement des utilisateurs')
    });
  }

  getUserName(id: string): string {
    return this.userNames[id] || id;
  }

  getTeamName(id: string): string {
    if (!id) return 'Unknown';
    if (this.teamNames[id]) return this.teamNames[id];
    
    // If name is not in cache, fetch it individually
    this.fetchMissingTeamName(id);
    return id; // temporary fallback to ID
  }

  private fetchMissingTeamName(id: string): void {
    // Basic check to avoid redundant calls for same ID
    if ((this as any).loadingTeams?.[id]) return;
    if (!(this as any).loadingTeams) (this as any).loadingTeams = {};
    (this as any).loadingTeams[id] = true;

    this.teamService.getTeamById(id).subscribe({
      next: (team) => {
        if (team && team.name) {
          this.teamNames[id] = team.name;
        }
        delete (this as any).loadingTeams[id];
      },
      error: () => {
        // Mark as error to prevent further attempts?
        this.teamNames[id] = id; 
        delete (this as any).loadingTeams[id];
      }
    });
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
    const friendlyEvents = events.filter(
      e => !e.isCompetition && e.teamIds && e.teamIds.length > 0
    );

    if (friendlyEvents.length === 0) return;

    friendlyEvents.forEach(ev => {
      if (!ev.terrainId) return;

      this.matchService.filterByTerrain(ev.terrainId).pipe(
        catchError(() => of([]))
      ).subscribe(matches => {
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
      this.selectedType === 'COMPETITION' ? !!e.isCompetition : !e.isCompetition
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

  canEditStatus(event: Event): boolean {
    const role = this.authService.getUserRole();
    const userId = this.authService.getUserId();
    if (role === 'ADMIN' || role === 'Admin') return true;
    return event.createdBy?.id === userId;
  }

  toggleStatusMenu(event: Event, eventObj: MouseEvent): void {
    eventObj.stopPropagation();
    if (this.canEditStatus(event)) {
      this.editingStatusId = this.editingStatusId === event.id ? null : event.id;
    } else {
      alert("You don't have permission to change this event status.");
    }
  }

  changeStatus(event: Event, newStatut: StatutEvent): void {
    this.isLoading = true;
    this.eventService.changeStatut(event.id, newStatut).subscribe({
      next: (updated) => {
        event.statutEvent = updated.statutEvent;
        this.editingStatusId = null;
        this.isLoading = false;
        this.applyFilters();
      },
      error: () => {
        alert('Error updating status.');
        this.isLoading = false;
        this.editingStatusId = null;
      }
    });
  }

  get isSportif(): boolean {
    const role = this.authService.getUserRole();
    return role?.toUpperCase() === 'SPORTIF';
  }

  canJoin(event: Event): boolean {
    if (!this.isSportif || event.isCompetition) return false;
    const userId = this.authService.getUserId();
    if (!userId) return false;
    return !event.participantIds?.includes(userId);
  }

  canLeave(event: Event): boolean {
    if (!this.isSportif || event.isCompetition) return false;
    const userId = this.authService.getUserId();
    if (!userId) return false;
    return !!event.participantIds?.includes(userId);
  }

  joinEvent(eventId: string, e: MouseEvent): void {
    e.stopPropagation();
    this.isLoading = true;
    this.eventService.joinEvent(eventId).subscribe({
      next: (updatedEvent) => {
        this.loadEvents(); // Reload everything to ensure sync
        if (this.selectedEventForModal?.id === eventId) {
          this.selectedEventForModal = updatedEvent;
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Erreur lors de la participation.');
        this.isLoading = false;
      }
    });
  }

  leaveEvent(eventId: string, e: MouseEvent): void {
    e.stopPropagation();
    this.isLoading = true;
    this.eventService.leaveEvent(eventId).subscribe({
      next: (updatedEvent) => {
        this.loadEvents();
        if (this.selectedEventForModal?.id === eventId) {
          this.selectedEventForModal = updatedEvent;
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Erreur lors de l\'annulation.');
        this.isLoading = false;
      }
    });
  }

  openModal(event: Event): void {
    this.selectedEventForModal = event;
  }

  closeModal(): void {
    this.selectedEventForModal = null;
  }
}