import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap, catchError, tap } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { EventService } from '../../events/service/event.service';
import { CreateEventRequest, EventType, CompetitionFormat, StatutEvent } from '../event.model';
import { SportService } from '../../sports/services/sport.service';
import { TerrainService } from '../../../terrains/services/terrain.service'; 
import { Sport } from '../../../features/sports/sport.model'; 
import { Terrain } from '../../../terrains/models/terrain.model';
import { TeamService, Team } from '../../teams/services/team.service';
@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css']
})
export class EventFormComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  isLoading = false;
  isEditMode = false;
  eventId: string | null = null;
  errorMsg = '';
  successMsg = '';

  eventTypes: EventType[] = [];
  sports: Sport[] = [];
  terrains: Terrain[] = [];
  filteredTerrains: Terrain[] = [];
  teams: Team[] = [];
  selectedEventType: EventType | null = null;

  // Autocomplete
  locationSuggestions: any[] = [];
  isSearchingLocation = false;
  private locationSub?: Subscription;

  private sportNameToType: Record<string, string> = {
    'Football':   'FOOTBALL',
    'Basketball': 'BASKETBALL',
    'Tennis':     'TENNIS',
    'Volleyball': 'VOLLEYBALL',
    'Futsal':     'FUTSAL',
    'Padel':      'PADEL',
    'Rugby':      'RUGBY',
    'Handball':   'HANDBALL',
  };

  formatOptions = [
    { label: 'League',      value: CompetitionFormat.LEAGUE },
    { label: 'Knockout',    value: CompetitionFormat.KNOCKOUT },
    { label: 'Tournament',  value: CompetitionFormat.TOURNAMENT },
  ];

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private sportService: SportService,
    private terrainService: TerrainService,
    private teamService: TeamService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.setupLocationAutocomplete();
    this.loadEventTypes();
    this.loadSports();    // ← NOUVEAU
    this.loadTerrains();  // ← NOUVEAU
    this.loadTeams();

    // mode edit si URL contient un id
    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEditMode = true;
      this.loadEvent(this.eventId);
    }
  }

  buildForm(): void {
    this.form = this.fb.group({
      // ── champs de base ────────────────────────────────────────
      name:        ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      location:    ['', Validators.required],
      startDate:   ['', Validators.required],
      endDate:     ['', Validators.required],
      sportId:     ['', Validators.required],
      terrainId:   [''],
      eventTypeId: ['', Validators.required],

      // ── compétition ───────────────────────────────────────────
      competitionName: [''],
      maxTeam:         [null],

      // ── équipes (Friendly Match) ───────────────────────────────
      teamIds: [[]],
    });
  }
  loadEventTypes(): void {
    this.eventService.getEventTypes().subscribe({
      next: (types) => this.eventTypes = types,
      error: () => this.errorMsg = 'Erreur lors du chargement des types.'
    });
  }
  loadSports(): void {
    this.sportService.getAll().subscribe({
      next: (sports) => this.sports = sports,
      error: () => console.warn('sport-service indisponible')
    });
  }

  loadTerrains(): void {
    this.terrainService.getAll().subscribe({
      next: (terrains) => {
        this.terrains = terrains;
        this.filterTerrains(); // ← filter directly
      },
      error: () => console.warn('terrain-service indisponible')
    });
  }

  loadTeams(): void {
    this.teamService.getTeams().subscribe({
      next: (teams) => this.teams = teams,
      error: () => console.warn('team-service indisponible')
    });
  }

  loadEvent(id: string): void {
    this.isLoading = true;
    this.eventService.getById(id).subscribe({
      next: (event) => {
        this.form.patchValue({
          name:            event.name,
          description:     event.description,
          location:        event.location,
          startDate:       event.startDate,
          endDate:         event.endDate,
          sportId:         event.sportId,
          terrainId:       event.terrainId,
          eventTypeId:     event.eventType?.id,
          competitionName: event.competition?.nameCompetition,
          maxTeam:         event.competition?.maxTeam,
          format:          event.competition?.format,
          teamIds:         event.teamIds || [],
        });
        this.onEventTypeChange(event.eventType?.id);
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'Événement non trouvé.';
        this.isLoading = false;
      }
    });
  }
  onEventTypeChange(eventTypeId: string | undefined): void {
    this.selectedEventType = this.eventTypes.find(t => t.id === eventTypeId) || null;

    // ajouter/supprimer validators dynamiquement
    if (this.selectedEventType?.isCompetition) {
      this.form.get('competitionName')?.setValidators(Validators.required);
      this.form.get('maxTeam')?.setValidators([Validators.required, Validators.min(2)]);
      this.form.get('teamIds')?.clearValidators();
    } else if (this.selectedEventType?.requiresTeams) {
      this.form.get('teamIds')?.setValidators([Validators.required, Validators.minLength(2)]);
      this.form.get('competitionName')?.clearValidators();
      this.form.get('maxTeam')?.clearValidators();
    } else {
      this.form.get('competitionName')?.clearValidators();
      this.form.get('maxTeam')?.clearValidators();
      this.form.get('teamIds')?.clearValidators();
    }

    // mettre à jour la validation
    ['competitionName', 'maxTeam', 'teamIds'].forEach(field => {
      this.form.get(field)?.updateValueAndValidity();
    });
  }

  buildRequest(): CreateEventRequest {
    const v = this.form.value;
    const req: CreateEventRequest = {
      name:        v.name,
      description: v.description,
      location:    v.location,
      startDate:   v.startDate,
      endDate:     v.endDate,
      sportId:     v.sportId,
      terrainId:   v.terrainId || undefined,
      eventTypeId: v.eventTypeId,
    };

    if (this.selectedEventType?.isCompetition) {
      req.competitionName = v.competitionName;
      req.maxTeam = v.maxTeam;
      
      // Auto-assign format based on event type
      const typeName = (this.selectedEventType.typeName || '').toUpperCase();
      if (typeName.includes('LEAGUE') || typeName.includes('CHAMPIONNAT')) {
        req.format = CompetitionFormat.LEAGUE;
      } else if (typeName.includes('KNOCKOUT') || typeName.includes('COUPE') || typeName.includes('ELIMINATION')) {
        req.format = CompetitionFormat.KNOCKOUT;
      } else {
        req.format = CompetitionFormat.TOURNAMENT;
      }
    }

    if (this.selectedEventType?.requiresTeams && !this.selectedEventType?.isCompetition) {
      req.teamIds = Array.isArray(v.teamIds) ? v.teamIds : [];
    }

    return req;
  }
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';
    this.successMsg = '';

    const req = this.buildRequest();

    const call = this.isEditMode && this.eventId
      ? this.eventService.update(this.eventId, req)
      : this.eventService.create(req);

    call.subscribe({
      next: () => {
        this.successMsg = this.isEditMode
          ? 'Événement mis à jour avec succès !'
          : 'Événement créé avec succès !';
        this.isLoading = false;
        setTimeout(() => this.router.navigate(['/events']), 1500);
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || 'Erreur lors de la sauvegarde.';
        this.isLoading = false;
      }
    });
  }
  cancel(): void {
    this.router.navigate(['/events']);
  }
  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  get isCompetition(): boolean {
    return !!this.selectedEventType?.isCompetition;
  }

  get requiresTeams(): boolean {
    return !!this.selectedEventType?.requiresTeams && !this.selectedEventType?.isCompetition;
  }
  get todayDate(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get minEndDate(): string {
    const start = this.form?.get('startDate')?.value;
    return start ? start : this.todayDate;
  }

  getSelectedSportName(): string {
    const id = this.form.get('sportId')?.value;
    return this.sports.find(s => s.id === id)?.nameSport || '';
  }

  getSelectedTerrainName(): string {
    const id = this.form.get('terrainId')?.value;
    const t = this.terrains.find(t => t.id === id);
    return t ? `${t.nom} — ${t.ville}` : '';
  }
  onSportChange(sportId: string): void {
    // reset team selections
    this.form.get('teamIds')?.setValue([]);
    this.form.get('teamIds')?.updateValueAndValidity();

    this.filterTerrains();
  }

  filterTerrains(): void {
    const sportId = this.form.get('sportId')?.value;
    const locationVal = (this.form.get('location')?.value || '').toLowerCase();

    let temps = this.terrains;

    // 1. Filter by Sport
    if (sportId) {
      const selectedSport = this.sports.find(s => s.id === sportId);
      if (selectedSport) {
        const sportType = this.sportNameToType[selectedSport.nameSport];
        if (sportType) {
          temps = temps.filter(t => t.typeSport === sportType);
        }
      }
    }

    // 2. Filter by Location (City/Ville)
    if (locationVal && locationVal.length > 2) {
      temps = temps.filter(t => {
        const ville = (t.ville || '').toLowerCase();
        if (!ville) return false;
        // Permissive match: either typed location includes the terrain city, or terrain city includes typed location
        return locationVal.includes(ville) || ville.includes(locationVal);
      });
    }

    this.filteredTerrains = temps;

    // Deselect if current terrain is no longer in the filtered list
    const currentTId = this.form.get('terrainId')?.value;
    if (currentTId && !this.filteredTerrains.some(t => t.id === currentTId)) {
      this.form.get('terrainId')?.setValue('');
    }
  }
  /** Pourcentage de la barre de progression (stepper) */
  get stepProgress(): number {
    const fields = ['eventTypeId', 'name', 'description', 'location', 'startDate', 'endDate', 'sportId'];
    const filled = fields.filter(f => !!this.form.get(f)?.value).length;
    return Math.round((filled / fields.length) * 100);
  }

  /** Sélectionne le premier eventType qui correspond au flag */
  selectEventTypeByFlag(flag: 'competition' | 'teams'): void {
    let target: EventType | undefined;

    if (flag === 'competition') {
      target = this.eventTypes.find(t => t.isCompetition);
    } else if (flag === 'teams') {
      // ici on prend le premier qui nécessite des équipes, peu importe si compétition ou pas
      target = this.eventTypes.find(t => t.requiresTeams);
    }

    if (target) {
      this.form.get('eventTypeId')?.setValue(target.id); // <- corrige id → _id
      this.onEventTypeChange(target.id);
    }
  }

  /** Sélection manuelle depuis l'UI */
  selectEventType(type: any) {
    this.form.get('eventTypeId')?.setValue(type.id);
    this.onEventTypeChange(type.id);
  }

  // ==== EXTRA LOGIC FOR CUSTOM TEAM MULTI-SELECT ====
  get selectedTeamIds(): string[] {
    return this.form.get('teamIds')?.value || [];
  }

  get availableTeams(): Team[] {
    const selected = this.selectedTeamIds;
    let filtered = this.teams.filter(t => t.id && !selected.includes(t.id));

    const sportId = this.form.get('sportId')?.value;
    if (sportId) {
      const selectedSport = this.sports.find(s => s.id === sportId);
      if (selectedSport) {
        const sportType = this.sportNameToType[selectedSport.nameSport];
        // On vérifie le sport de l'équipe soit par rapport au type majuscule (FOOTBALL) soit par rapport au nom (Football)
        filtered = filtered.filter(t => {
          const teamSport = (t.sport || '').toUpperCase();
          return teamSport === (sportType || '').toUpperCase() || 
                 teamSport === (selectedSport.nameSport || '').toUpperCase();
        });
      }
    }
    return filtered;
  }

  get selectedTeamsObjects(): Team[] {
    const selected = this.selectedTeamIds;
    return this.teams.filter(t => t.id && selected.includes(t.id));
  }

  addTeamToSelection(event: any): void {
    const target = event.target as HTMLSelectElement;
    const teamId = target.value;
    if (!teamId) return;

    const current = [...this.selectedTeamIds];
    if (!current.includes(teamId)) {
      current.push(teamId);
      this.form.get('teamIds')?.setValue(current);
      this.form.get('teamIds')?.markAsTouched();
      this.form.get('teamIds')?.updateValueAndValidity();
    }
    target.value = ''; // reset select
  }

  removeTeamFromSelection(teamId: string): void {
    const current = this.selectedTeamIds.filter(id => id !== teamId);
    this.form.get('teamIds')?.setValue(current);
    this.form.get('teamIds')?.markAsTouched();
    this.form.get('teamIds')?.updateValueAndValidity();
  }

  // ==== LOCATION GEOLOCATION (NOMINATIM) ====
  setupLocationAutocomplete(): void {
    const locCtrl = this.form.get('location');
    if (!locCtrl) return;

    this.locationSub = locCtrl.valueChanges.pipe(
      tap(() => this.filterTerrains()), // Filtre instantané pendant la saisie
      debounceTime(450),
      distinctUntilChanged(),
      switchMap((value: string) => {
        if (!value || value.trim().length < 3) {
          this.locationSuggestions = [];
          return of([]);
        }
        this.isSearchingLocation = true;
        // Limit to 4 results, country=Tunisia
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value.trim())}&countrycodes=tn&format=json&limit=4&addressdetails=1`;
        return this.http.get<any[]>(url).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe((results: any[]) => {
      this.isSearchingLocation = false;
      this.locationSuggestions = results;
    });
  }

  selectLocation(suggestion: any): void {
    const parts = suggestion.display_name.split(',');
    // Garder seulement les deux premières parties (ex: "Sousse, Gouvernorat Sousse")
    const shortName = parts.length >= 2 ? parts.slice(0, 2).join(',').trim() : suggestion.display_name;
    
    this.form.get('location')?.setValue(shortName, { emitEvent: false });
    this.locationSuggestions = [];
    this.filterTerrains(); // MAJ des terrains basés sur la sélection finalisée
  }

  onLocationBlur(): void {
    setTimeout(() => {
      this.locationSuggestions = [];
    }, 250); // Timeout pour laisser le clic se faire sur la suggestion
  }

  ngOnDestroy(): void {
    if (this.locationSub) {
      this.locationSub.unsubscribe();
    }
  }
}