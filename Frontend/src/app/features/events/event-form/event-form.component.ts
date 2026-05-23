import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap, catchError, tap } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { EventService } from '../../events/service/event.service';
import { CreateEventRequest, UpdateEventRequest, Event, EventType, CompetitionFormat, StatutEvent } from '../event.model';
import { SportService } from '../../sports/services/sport.service';
import { TerrainService } from '../../../terrains/services/terrain.service'; 
import { Sport } from '../../../features/sports/sport.model'; 
import { Terrain } from '../../../terrains/models/terrain.model';
import { TeamService, Team } from '../../teams/services/team.service';
import { UserManagementService, User } from '../../../core/services/UserService/user-management.service';
import { AIService, AISuggestion } from '../../../core/services/AIService/ai.service';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css']
})
export class EventFormComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  isInitialLoad = false;
  isLoading = false;
  isEditMode = false;
  eventId: string | null = null;
  originalEvent: Event | null = null;
  errorMsg = '';
  successMsg = '';

  // AI State
  aiLoading = false;
  aiSuggestion: AISuggestion | null = null;
  contextAnalysis: any = null;
  nameSuggestions: string[] = [];
  showAITypeProposal = false;
  eventPrediction: any = null;
  isPredictingEvent = false;

  eventTypes: EventType[] = [];
  filteredEventTypes: EventType[] = [];
  sports: Sport[] = [];
  terrains: Terrain[] = [];
  filteredTerrains: Terrain[] = [];
  teams: Team[] = [];
  users: User[] = [];
  selectedEventType: EventType | null = null;

  // Autocomplete
  locationSuggestions: any[] = [];
  startPointSuggestions: any[] = [];
  endPointSuggestions: any[] = [];
  isSearchingLocation = false;
  isSearchingStartPoint = false;
  isSearchingEndPoint = false;
  
  // Map state
  map: L.Map | null = null;
  routingControl: any = null;
  mapMode: 'start' | 'end' | 'stop' | null = null;
  totalRouteDistance: number = 0;
  
  startMarker: L.Marker | null = null;
  endMarker: L.Marker | null = null;
  stopMarkers: L.Marker[] = [];
  terrainMarkers: L.Marker[] = [];
  
  startLatLng: L.LatLng | null = null;
  endLatLng: L.LatLng | null = null;
  routeLine: L.LatLng[] = []; // current drawn polyline
  
  private locationSub?: Subscription;
  private startPointSub?: Subscription;
  private endPointSub?: Subscription;

  private sportNameToType: Record<string, string> = {
    'Football':   'FOOTBALL',
    'Basketball': 'BASKETBALL',
    'Tennis':     'TENNIS',
    'Volleyball': 'VOLLEYBALL',
    'Futsal':     'FUTSAL',
    'Padel':      'PADEL',
    'Rugby':      'RUGBY',
    'Handball':   'HANDBALL',
    'Cycling':    'CYCLING',
    'Running':    'RUNNING',
    'Ciclisme':   'CYCLING',
    'Course':     'RUNNING',
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
    private userService: UserManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private aiService: AIService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.setupLocationAutocomplete();
    this.setupStartPointAutocomplete();
    this.setupEndPointAutocomplete();
    this.loadEventTypes();
    this.loadSports();    // ← NOUVEAU
    this.loadTerrains();  // ← NOUVEAU
    this.loadTeams();
    this.loadUsers();
    this.setupMapListeners();

    // mode edit si URL contient un id
    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEditMode = true;
      // loadEvent will be called only after eventTypes are loaded (see loadEventTypes)
      this.loadEvent(this.eventId);
    }
    
    // Subscribe to distance changes to redraw stop markers
    this.distancesControl.valueChanges.subscribe(() => {
       this.drawStopMarkers();
    });
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
      participantIds: [[]],

      // ── parcours ───────────────────────────────────────────
      startPoint:  [''],
      endPoint:    [''],
      distances:   this.fb.array([this.fb.control('', Validators.min(0))]), 
    });

    // Watch teamIds or participantIds to trigger prediction
    this.form.valueChanges.subscribe(v => {
       const ids = this.isIndividualSport ? v.participantIds : v.teamIds;
       if (Array.isArray(ids) && ids.length >= 2) {
          this.runEventPrediction();
       } else {
          this.eventPrediction = null;
       }
    });
  }
  loadEventTypes(): void {
    this.eventService.getEventTypes().subscribe({
      next: (types) => {
        this.eventTypes = types.map(t => ({ ...t, id: t.id || (t as any)._id }));
        this.filterEventTypes();
        // If event data is already loaded (edit mode), restore the eventType by name
        if (this.isEditMode && this.originalEvent?.eventTypeName) {
          const resolvedType = this.resolveEventTypeByName(this.originalEvent.eventTypeName);
          if (resolvedType) {
            this.filterEventTypes();
            this.onEventTypeChange(resolvedType.id);
            this.form.get('eventTypeId')?.setValue(resolvedType.id);
          }
        }
      },
      error: () => this.errorMsg = 'Erreur lors du chargement des types.'
    });
  }

  /** Find an EventType from the loaded list by its typeName (case-insensitive) */
  private resolveEventTypeByName(name?: string): EventType | undefined {
    if (!name || this.eventTypes.length === 0) return undefined;
    const normalized = name.trim().toLowerCase();
    return this.eventTypes.find(t => t.typeName.trim().toLowerCase() === normalized);
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
        if (!Array.isArray(terrains)) return;
        // Normalize IDs: ensure every terrain has an 'id' property
        this.terrains = terrains.map(t => ({
          ...t,
          id: t.id || (t as any)._id
        }));
        this.filterTerrains();
        // If event data is already loaded (edit mode), restore the terrain selection
        if (this.isEditMode && this.originalEvent?.terrainId) {
          this.form.get('terrainId')?.setValue(this.originalEvent.terrainId);
        }
      },
      error: () => console.warn('terrain-service indisponible')
    });
  }

  loadTeams(): void {
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        if (!Array.isArray(teams)) return;
        this.teams = teams.map(t => ({ ...t, id: t.id || (t as any)._id }));
      },
      error: () => console.warn('team-service indisponible')
    });
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => this.users = users,
      error: () => console.warn('user-service indisponible')
    });
  }

  loadEvent(id: string): void {
    this.isLoading = true;
    this.isInitialLoad = true;
    this.eventService.getById(id).subscribe({
      next: (event) => {
        this.originalEvent = event;
        
        // Setup sport context (without resetting fields, isInitialLoad guards it)
        this.onSportChange(event.sportId ?? '');

        // Resolve eventTypeId by name since the backend doesn't return eventType.id in the response
        const resolvedTypeForPatch = this.resolveEventTypeByName(event.eventTypeName);

        this.form.patchValue({
          name:            event.name,
          description:     event.description,
          location:        event.location,
          startDate:       event.startDate,
          endDate:         event.endDate,
          sportId:         event.sportId,
          terrainId:       event.terrainId,
          eventTypeId:     resolvedTypeForPatch?.id ?? '',
          competitionName: event.competition?.nameCompetition ?? event.competitionName,
          maxTeam:         event.competition?.maxTeam,
          format:          event.competition?.format,
          teamIds:         event.teamIds || [],
          participantIds:  event.participantIds || [],
          startPoint:      event.startPoint || '',
          endPoint:        event.endPoint || '',
        }, { emitEvent: false });

        // Dismiss any autocomplete dropdowns triggered by patchValue
        this.locationSuggestions = [];
        this.startPointSuggestions = [];
        this.endPointSuggestions = [];

        // Patch distances
        if (event.distances && event.distances.length > 0) {
          const distancesArray = this.form.get('distances') as FormArray;
          distancesArray.clear();
          event.distances.forEach(d => distancesArray.push(this.fb.control(d, Validators.min(0))));
        }

        // Try to apply eventType now (works if eventTypes already loaded)
        const resolvedType = this.resolveEventTypeByName(event.eventTypeName);
        if (resolvedType) {
          this.filterEventTypes();
          this.onEventTypeChange(resolvedType.id);
          this.form.get('eventTypeId')?.setValue(resolvedType.id);
        }
        // Otherwise loadEventTypes() will handle it via originalEvent check

        // Restore map for route-based sports
        if (event.routePath && event.routePath.length > 0) {
          setTimeout(() => this.restoreMapFromData(event), 500);
        }

        this.isLoading = false;
        // Allow a tick for all async pipes to settle, then disable load protection
        setTimeout(() => { this.isInitialLoad = false; }, 100);
      },
      error: () => {
        this.errorMsg = 'Événement non trouvé.';
        this.isLoading = false;
        this.isInitialLoad = false;
      }
    });

  }

  private restoreMapFromData(event: Event): void {
    if (!event.routePath || event.routePath.length === 0) return;
    
    // We expect the map to be initialized via change detection since requiresSpecialRoute becomes true
    if (!this.map) {
      // Retry in 100ms if map not ready
      setTimeout(() => this.restoreMapFromData(event), 200);
      return;
    }

    this.clearRoute();
    
    // Set points
    const points = event.routePath.map(p => L.latLng(p.lat, p.lng));
    if (points.length >= 1) this.startLatLng = points[0];
    if (points.length >= 2) this.endLatLng = points[points.length - 1];

    // Reconstruct routing
    if (this.routingControl) {
      this.routingControl.setWaypoints(points);
    }

    // Zoom
    const group = L.featureGroup(points.map(p => L.marker(p)));
    this.map.fitBounds(group.getBounds().pad(0.1));
  }
  onEventTypeChange(eventTypeId: string | undefined): void {
    this.selectedEventType = this.eventTypes.find(t => t.id === eventTypeId) || null;

    // reset fields if not applicable
    if (!this.requiresParticipants) {
       this.form.get('teamIds')?.setValue([]);
       this.form.get('participantIds')?.setValue([]);
    }

    if (this.selectedEventType?.isCompetition) {
      this.form.get('competitionName')?.setValidators(Validators.required);
      this.form.get('maxTeam')?.setValidators([Validators.required, Validators.min(2)]);
    } else {
      this.form.get('competitionName')?.clearValidators();
      this.form.get('maxTeam')?.clearValidators();
    }

    // Update value/validity
    ['competitionName', 'maxTeam', 'teamIds', 'participantIds'].forEach(field => {
      this.form.get(field)?.updateValueAndValidity();
    });
  }

  buildRequest(): CreateEventRequest {
    const v = this.form.value;
    const req: CreateEventRequest = {
      name:        v.name,
      description: v.description,
      location:    v.location,
      startDate:   this.formatDate(v.startDate),
      endDate:     this.formatDate(v.endDate),
      sportId:     v.sportId,
      terrainId:   v.terrainId || undefined,
      eventTypeId: v.eventTypeId,
    };

    if (this.isCompetition) {
      req.competitionName = v.competitionName;
      req.maxTeam = v.maxTeam;
      
      const typeName = (this.selectedEventType?.typeName || '').toUpperCase();
      if (typeName.includes('LEAGUE') || typeName.includes('CHAMPIONNAT')) {
        req.format = CompetitionFormat.LEAGUE;
      } else if (typeName.includes('KNOCKOUT') || typeName.includes('COUPE') || typeName.includes('ELIMINATION')) {
        req.format = CompetitionFormat.KNOCKOUT;
      } else {
        req.format = CompetitionFormat.TOURNAMENT;
      }
    }

    if (this.requiresParticipants) {
      if (this.isIndividualSport) {
        req.participantIds = Array.isArray(v.participantIds) ? v.participantIds : [];
      } else {
        req.teamIds = Array.isArray(v.teamIds) ? v.teamIds : [];
      }
    }

    // Add route fields
    if (this.contextAnalysis?.requiresSpecialRoute) {
      req.startPoint = v.startPoint;
      req.endPoint = v.endPoint;
      req.distances = v.distances ? v.distances.filter((d: any) => d !== null && d !== '') : [];
      if (this.routeLine && this.routeLine.length > 0) {
        (req as any).routePath = this.routeLine.map(point => ({ lat: point.lat, lng: point.lng }));
      } else if (this.startLatLng || this.endLatLng) {
        const path: any[] = [];
        if (this.startLatLng) path.push({ lat: this.startLatLng.lat, lng: this.startLatLng.lng });
        if (this.endLatLng) path.push({ lat: this.endLatLng.lat, lng: this.endLatLng.lng });
        (req as any).routePath = path;
      }
    }

    return req;
  }

  buildUpdateRequest(): UpdateEventRequest {
    const v = this.form.value;
    const req: UpdateEventRequest = {
      name:        v.name,
      description: v.description,
      location:    v.location,
      startDate:   this.formatDate(v.startDate),
      endDate:     this.formatDate(v.endDate),
      terrainId:   v.terrainId || undefined,
      statutEvent: this.originalEvent?.statutEvent,
    };

    if (this.selectedEventType?.isCompetition) {
      req.competitionName = v.competitionName;
      req.maxTeam = v.maxTeam;
      // ... format logic ...
    }

    if (this.requiresParticipants) {
       if (this.isIndividualSport) {
          req.participantIds = Array.isArray(v.participantIds) ? v.participantIds : [];
       } else {
          req.teamIds = Array.isArray(v.teamIds) ? v.teamIds : [];
       }
    }

    // Add route fields
    if (this.contextAnalysis?.requiresSpecialRoute) {
      req.startPoint = v.startPoint;
      req.endPoint = v.endPoint;
      req.distances = v.distances ? v.distances.filter((d: any) => d !== null && d !== '') : [];
      if (this.routeLine && this.routeLine.length > 0) {
        (req as any).routePath = this.routeLine.map(point => ({ lat: point.lat, lng: point.lng }));
      } else if (this.startLatLng || this.endLatLng) {
        const path: any[] = [];
        if (this.startLatLng) path.push({ lat: this.startLatLng.lat, lng: this.startLatLng.lng });
        if (this.endLatLng) path.push({ lat: this.endLatLng.lat, lng: this.endLatLng.lng });
        (req as any).routePath = path;
      }
    }

    return req;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    // if it's full ISO, extract YYYY-MM-DD
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    return dateStr;
  }
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';
    this.successMsg = '';

    const req = this.isEditMode ? this.buildUpdateRequest() : this.buildRequest();

    const call = this.isEditMode && this.eventId
      ? this.eventService.update(this.eventId, req as UpdateEventRequest)
      : this.eventService.create(req as CreateEventRequest);

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

  get isIndividualSport(): boolean {
    const sportId = this.form.get('sportId')?.value;
    if (!sportId) return false;
    const sport = this.sports.find(s => s.id === sportId);
    if (!sport) return false;
    const individualSports = ['CYCLING', 'RUNNING', 'NATATION', 'MARATHON', 'YOGA'];
    return individualSports.includes(sport.nameSport.toUpperCase());
  }

  get requiresParticipants(): boolean {
    if (!this.selectedEventType) return false;
    // On permet la sélection si c'est une compétition OU si le type requiert explicitement des équipes
    return this.isCompetition || this.selectedEventType.requiresTeams !== false || this.isIndividualSport;
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
    // Don't reset selections during initial edit mode load
    if (!this.isInitialLoad) {
      // reset team selections
      this.form.get('teamIds')?.setValue([]);
      this.form.get('teamIds')?.updateValueAndValidity();

      // Reset event type selection since we are changing sport
      this.form.get('eventTypeId')?.setValue('');
      this.selectedEventType = null;
    }

    this.filterEventTypes();
    this.filterTerrains();
    this.runContextAnalysis();
    this.runAISuggestion();
  }

  filterEventTypes(): void {
    const sportName = this.getSelectedSportName().toLowerCase();
    
    if (!sportName) {
      this.filteredEventTypes = [...this.eventTypes];
      return;
    }

    this.filteredEventTypes = this.eventTypes.filter(type => {
      const typeName = type.typeName.toLowerCase();
      
      if (typeName.includes(sportName)) {
        return true;
      }
      
      // If the event type explicitly contains the name of ANY OTHER sport in our DB, hide it.
      // E.g. "Football Tournament" hides when selecting "Cycling".
      const belongsToOtherSport = this.sports.some(s => 
         s.nameSport.toLowerCase() !== sportName && 
         typeName.includes(s.nameSport.toLowerCase())
      );
      
      if (belongsToOtherSport) {
        return false;
      }

      // Dynamic Filtering via AI Assistance: 
      // If the AI determined this is a Special Route sport (like Cycling/Running),
      // we hide generic team competitions like Tournament, League, Friendly Match.
      if (this.contextAnalysis?.requiresSpecialRoute) {
         if (!typeName.includes('session') && !typeName.includes('course') && !typeName.includes('camp')) {
             return false;
         }
      }

      // Default: show generic event types for all sports
      return true;
    });
  }

  filterTerrains(): void {
    const sportId = this.form.get('sportId')?.value;
    const locationVal = (this.form.get('location')?.value || '').toLowerCase();

    let temps = [...this.terrains];

    // 1. Filter by Sport
    if (sportId) {
      const selectedSport = this.sports.find(s => s.id === sportId);
      if (selectedSport) {
        // Find mapping case-insensitively
        const sportKey = Object.keys(this.sportNameToType).find(
          k => k.toLowerCase() === selectedSport.nameSport.toLowerCase()
        );
        const sportType = sportKey ? this.sportNameToType[sportKey] : null;
        
        const filteredBySport = temps.filter(t => {
          const terrainSport = (t.typeSport || '').toString().toUpperCase();
          const targetSportType = (sportType || '').toUpperCase();
          const targetSportName = (selectedSport.nameSport || '').trim().toUpperCase();

          return (targetSportType && terrainSport === targetSportType) || 
                 terrainSport === targetSportName;
        });

        // Fallback: if no terrains match this sport exactly, we don't clear the list 
        // to avoid blocking the user, but we prioritize matches.
        if (filteredBySport.length > 0) {
          temps = filteredBySport;
        }
      }
    }

    // 2. Filter by Location (City/Ville)
    if (locationVal && locationVal.length > 2) {
      const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const locNormalized = removeAccents(locationVal).toLowerCase();
      const locParts = locNormalized.split(',').map((p: string) => p.trim());
      
      temps = temps.filter(t => {
        const ville = removeAccents(t.ville || '').toLowerCase();
        if (!ville) return false;
        return locParts.some((p: string) => p.includes(ville) || ville.includes(p));
      });
    }

    this.filteredTerrains = temps;
    this.updateTerrainMarkers();

    // Deselect if current terrain is no longer in the filtered list
    // But don't do this during initial edit mode load - we need to keep the original value
    if (!this.isInitialLoad) {
      const currentTId = this.form.get('terrainId')?.value;
      if (currentTId && !this.filteredTerrains.some(t => t.id === currentTId)) {
        this.form.get('terrainId')?.setValue('');
      }
    }
  }
  /** Détermine l'étape actuelle (1, 2 ou 3) */
  get currentStep(): number {
    const hasSport = !!this.form.get('sportId')?.value;
    if (!hasSport) return 1;

    const hasBasicInfo = !!this.form.get('name')?.value && 
                         !!this.form.get('eventTypeId')?.value && 
                         !!this.form.get('startDate')?.value;
    if (!hasBasicInfo) return 2;

    return 3;
  }

  /** Libellé de l'étape actuelle */
  get currentStepLabel(): string {
    switch (this.currentStep) {
      case 1: return 'Choix du sport';
      case 2: return 'Informations générales';
      case 3: return 'Lieu et logistique';
      default: return 'Configuration';
    }
  }

  /** Pourcentage de la barre de progression (stepper) */
  get stepProgress(): number {
    const fields = ['sportId', 'eventTypeId', 'name', 'description', 'startDate', 'endDate', 'location', 'terrainId'];
    const filled = fields.filter(f => {
      const val = this.form.get(f)?.value;
      return val !== null && val !== undefined && val !== '' && (Array.isArray(val) ? val.length > 0 : true);
    }).length;
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
    this.runAISuggestion();
    this.runContextAnalysis();
  }

  // ==== AI FEATURES ====

  /**
   * Generates a description using AI.
   */
  generateAIDescription(): void {
    const sport = this.getSelectedSportName();
    const type = this.selectedEventType?.typeName || '';
    
    if (!sport || !this.selectedEventType) {
      this.errorMsg = 'Veuillez sélectionner un sport et un type d\'événement avant de générer une description.';
      return;
    }

    this.aiLoading = true;
    this.aiService.generateDescription(sport, type).subscribe({
      next: (desc) => {
        this.form.get('description')?.setValue(desc);
        this.aiLoading = false;
      },
      error: () => this.aiLoading = false
    });
  }

  /**
   * Generates a list of 3 name suggestions.
   */
  generateAINameSuggestions(): void {
    const sport = this.getSelectedSportName();
    const type = this.selectedEventType?.typeName || 'Event';

    if (!sport) {
      this.errorMsg = 'Veuillez sélectionner un sport avant de générer des idées de noms.';
      return;
    }

    this.aiLoading = true;
    this.nameSuggestions = [];
    this.aiService.generateNameSuggestions(sport, type).subscribe({
      next: (suggestions) => {
        this.nameSuggestions = suggestions;
        this.aiLoading = false;
      },
      error: () => this.aiLoading = false
    });
  }

  /**
   * Selects a name suggestion.
   */
  selectNameSuggestion(name: string): void {
    this.form.get('name')?.setValue(name);
    this.nameSuggestions = [];
  }

  /**
   * Predicts the event outcome based on selected teams using AI.
   */
  runEventPrediction(): void {
    const sportName = this.getSelectedSportName();
    const eventType = this.selectedEventType?.typeName || 'Event';
    
    // Use teams or individual participant names
    const participants = this.isIndividualSport
      ? this.selectedParticipantsObjects.map(u => `${u.firstName} ${u.lastName}`)
      : this.selectedTeamsObjects.map(t => t.name);

    console.log('AI Prediction trigger:', { sportName, eventType, participants });

    if (!sportName || !eventType || participants.length < 2) {
      this.eventPrediction = null;
      return;
    }

    this.isPredictingEvent = true;
    this.aiService.predictEventOutcome(sportName, eventType, participants).subscribe({
      next: (res) => {
        this.eventPrediction = res;
        this.isPredictingEvent = false;
      },
      error: () => {
        this.isPredictingEvent = false;
        this.eventPrediction = null;
      }
    });
  }

  /**
   * Runs AI analytics to suggest the best configuration.
   */
  runAISuggestion(): void {
    const sportId = this.form.get('sportId')?.value;
    const isComp = !!this.selectedEventType?.isCompetition;

    if (!sportId) return;

    this.aiLoading = true;
    this.aiService.suggestConfiguration(this.getSelectedSportName(), isComp).subscribe({
      next: (sugg) => {
        this.aiSuggestion = sugg;
        this.aiLoading = false;
        
        // Si l'IA propose un nouveau type, on l'affiche
        if (sugg.newTypeProposal) {
          const alreadyExists = this.eventTypes.find(t => t.typeName === sugg.newTypeProposal?.typeName);
          this.showAITypeProposal = !alreadyExists;
        }
      },
      error: () => this.aiLoading = false
    });
  }

  runContextAnalysis(): void {
    const sportName = this.getSelectedSportName();
    if (!sportName) {
      this.contextAnalysis = null;
      return;
    }

    const eventType = this.selectedEventType?.typeName || 'General';

    // Call AI Service dynamically for real context (No static hardcoded lists!)
    this.aiService.analyzeContext(sportName, eventType).subscribe({
      next: (res) => {
         this.contextAnalysis = res;
         
         if (res.requiresSpecialRoute) {
            this.form.get('terrainId')?.setValue('');
            this.form.get('terrainId')?.clearValidators();
            setTimeout(() => this.initMap(), 100);
         } else {
            this.clearRoute();
            // Ensure map stays for terrain filtering even if not special route
            if (!this.map) {
               setTimeout(() => this.initMap(), 100);
            }
         }
         this.form.get('terrainId')?.updateValueAndValidity();
         
         // Refilter Event Types and Terrains now that AI has provided context
         this.filterEventTypes();
         this.filterTerrains();
      },
      error: (err) => {
         // Fallback if AI fails: assume it's a standard terrain sport to not block form submission
         console.error('AI Context Analysis Error:', err);
         this.contextAnalysis = { advice: 'Pensez à bien définir le lieu.', requiresTerrain: true, requiresSpecialRoute: false };
         this.filterEventTypes();
         this.filterTerrains();
      }
    });


  }

  /**
   * Confirms and creates the AI proposed Event Type.
   */
  confirmAITypeCreation(): void {
    if (!this.aiSuggestion?.newTypeProposal) return;

    this.aiLoading = true;
    this.eventService.createEventType(this.aiSuggestion.newTypeProposal).subscribe({
      next: (newType) => {
        this.aiLoading = false;
        this.showAITypeProposal = false;
        this.successMsg = `Nouveau type "${newType.typeName}" créé avec succès !`;
        
        // Refresh types list and select the new one
        this.loadEventTypes();
        setTimeout(() => {
          const typeInList = this.eventTypes.find(t => t.typeName === newType.typeName);
          if (typeInList) this.selectEventType(typeInList);
          this.successMsg = '';
        }, 800);
      },
      error: (err) => {
        this.aiLoading = false;
        this.errorMsg = "Erreur lors de la création du type d'événement.";
      }
    });
  }

  /**
   * Applies the AI suggested configuration to the form.
   */
  applyAIRommendedType(): void {
    if (!this.aiSuggestion?.recommendedType) return;
    
    const targetType = this.aiSuggestion.recommendedType;
    const typeObj = this.eventTypes.find(t => 
      (targetType === 'COMPETITION' && t.isCompetition) || 
      (targetType === 'SIMPLE' && !t.isCompetition)
    );

    if (typeObj) {
      this.selectEventType(typeObj);
      this.successMsg = `Type d'événement "${typeObj.typeName}" recommandé par l'IA appliqué !`;
      setTimeout(() => this.successMsg = '', 3000);
    }
  }


  /**
   * Applies the AI suggested configuration to the form.
   */
  applyAISuggestion(): void {
    if (!this.aiSuggestion) return;

    const patches: any = {};
    if (this.aiSuggestion.maxTeams) patches.maxTeam = this.aiSuggestion.maxTeams;
    // We could apply duration but our form doesn't have an explicit 'duration' number, just start/end dates.
    
    this.form.patchValue(patches);
    this.successMsg = "Configuration suggérée par l'IA appliquée !";
    setTimeout(() => this.successMsg = '', 3000);
  }



  // ==== EXTRA LOGIC FOR CUSTOM TEAM MULTI-SELECT ====
  get selectedTeamIds(): string[] {
    return this.form.get('teamIds')?.value || [];
  }

  get availableTeams(): Team[] {
    const selected = this.selectedTeamIds;
    // 1. First filter by selection (remove already selected teams)
    let filtered = this.teams.filter(t => {
      const id = t.id;
      return !!id && !selected.includes(id);
    });

    // 2. Then try to filter by sport
    const sportId = this.form.get('sportId')?.value;
    if (sportId) {
      const selectedSport = this.sports.find(s => s.id === sportId);
      if (selectedSport) {
        // Robust sport type lookup (case-insensitive)
        const sportKey = Object.keys(this.sportNameToType).find(
          k => k.toLowerCase() === selectedSport.nameSport.toLowerCase()
        );
        const sportType = sportKey ? this.sportNameToType[sportKey] : null;

        const filteredBySport = filtered.filter(t => {
          const teamSport = (t.sport || '').toUpperCase();
          const targetSportType = (sportType || '').toUpperCase();
          const targetSportName = (selectedSport.nameSport || '').trim().toUpperCase();
          const targetSportId = (sportId || '').toUpperCase();

          return (targetSportType && teamSport === targetSportType) || 
                 teamSport === targetSportName ||
                 teamSport === targetSportId;
        });

        // Fallback: If filtering by sport gives NO results, we show all teams 
        // to avoid a dead-end UI, but prioritize the sport-match if possible.
        if (filteredBySport.length > 0) {
          filtered = filteredBySport;
        }
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

  // ==== EXTRA LOGIC FOR CUSTOM USER MULTI-SELECT (Participants) ====
  get selectedParticipantIds(): string[] {
    return this.form.get('participantIds')?.value || [];
  }

  get availableParticipants(): User[] {
    const selected = this.selectedParticipantIds;
    return this.users.filter(u => u.id && !selected.includes(u.id));
  }

  get selectedParticipantsObjects(): User[] {
    const selected = this.selectedParticipantIds;
    return this.users.filter(u => u.id && selected.includes(u.id));
  }

  addParticipantToSelection(event: any): void {
    const target = event.target as HTMLSelectElement;
    const userId = target.value;
    if (!userId) return;

    const current = [...this.selectedParticipantIds];
    if (!current.includes(userId)) {
      current.push(userId);
      this.form.get('participantIds')?.setValue(current);
      this.form.get('participantIds')?.markAsTouched();
      this.form.get('participantIds')?.updateValueAndValidity();
    }
    target.value = '';
  }

  removeParticipantFromSelection(userId: string): void {
    const current = this.selectedParticipantIds.filter(id => id !== userId);
    this.form.get('participantIds')?.setValue(current);
    this.form.get('participantIds')?.markAsTouched();
    this.form.get('participantIds')?.updateValueAndValidity();
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
        // Don't fire autocomplete during initial edit mode population
        if (this.isInitialLoad) {
          this.locationSuggestions = [];
          return of([]);
        }
        if (!value || value.trim().length < 3) {
          this.locationSuggestions = [];
          return of([]);
        }
        this.isSearchingLocation = true;
        // Limit to 4 results, country=Tunisia
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value.trim())}&countrycodes=tn&format=json&limit=4&addressdetails=1&email=contact@matchmakers.tn`;
        return this.http.get<any[]>(url).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe((results: any[]) => {
      this.isSearchingLocation = false;
      this.locationSuggestions = results;

      // Real-time Map Sync: Fly to first result while typing if no selection was made
      if (results && results.length > 0) {
        const first = results[0];
        if (first.lat && first.lon) {
          const lat = parseFloat(first.lat);
          const lon = parseFloat(first.lon);
          if (!this.map) {
             this.initMap();
             setTimeout(() => { if (this.map) this.map.flyTo([lat, lon], 12); }, 200);
          } else {
             this.map.flyTo([lat, lon], 12);
          }
        }
      }
    });
  }

  selectLocation(suggestion: any): void {
    const parts = suggestion.display_name.split(',');
    // Garder seulement les deux premières parties (ex: "Sousse, Gouvernorat Sousse")
    const shortName = parts.length >= 2 ? parts.slice(0, 2).join(',').trim() : suggestion.display_name;
    
    this.form.get('location')?.setValue(shortName, { emitEvent: false });
    this.locationSuggestions = [];
    this.filterTerrains(); // MAJ des terrains basés sur la sélection finalisée
    
    if (this.map && suggestion.lat && suggestion.lon) {
      this.map.flyTo([parseFloat(suggestion.lat), parseFloat(suggestion.lon)], 12);
    }
  }

  onLocationBlur(): void {
    const val = this.form.get('location')?.value;
    if (val && val.length > 2) {
      if (this.locationSuggestions.length > 0) {
        // Pick the first result that was found during typing
        const first = this.locationSuggestions[0];
        if (this.map && first.lat && first.lon) {
          this.map.flyTo([parseFloat(first.lat), parseFloat(first.lon)], 12);
        }
      } else {
        // No results were found yet, do a fresh search
        this.searchAndFly(val);
      }
    }
    this.filterTerrains();
    setTimeout(() => {
      this.locationSuggestions = [];
    }, 250); 
  }

  /**
   * Performs an immediate search for a location and flys the map to the first result.
   */
  searchAndFly(query: string): void {
    if (!query || query.length < 3) return;
    
    // Limits search to Tunisia
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=tn&format=json&limit=1&email=contact@matchmakers.tn`;
    this.http.get<any[]>(url).subscribe(results => {
      if (results && results.length > 0) {
        const first = results[0];
        if (this.map && first.lat && first.lon) {
          this.map.flyTo([parseFloat(first.lat), parseFloat(first.lon)], 12);
        }
      }
    });
  }

  // ==== START POINT GEOLOCATION ====
  setupStartPointAutocomplete(): void {
    const ctrl = this.form.get('startPoint');
    if (!ctrl) return;

    this.startPointSub = ctrl.valueChanges.pipe(
      debounceTime(450),
      distinctUntilChanged(),
      switchMap((value: string) => {
        if (!value || value.trim().length < 3) {
          this.startPointSuggestions = [];
          return of([]);
        }
        this.isSearchingStartPoint = true;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value.trim())}&countrycodes=tn&format=json&limit=4&addressdetails=1&email=contact@matchmakers.tn`;
        return this.http.get<any[]>(url).pipe(catchError(() => of([])));
      })
    ).subscribe((results: any[]) => {
      this.isSearchingStartPoint = false;
      this.startPointSuggestions = results;
    });
  }

  selectStartPoint(suggestion: any): void {
    const shortName = suggestion.display_name.split(',').length >= 2 
      ? suggestion.display_name.split(',').slice(0, 2).join(',').trim() 
      : suggestion.display_name;
    this.form.get('startPoint')?.setValue(shortName, { emitEvent: false });
    this.startPointSuggestions = [];
  }

  onStartPointBlur(): void {
    setTimeout(() => this.startPointSuggestions = [], 250);
  }

  // ==== END POINT GEOLOCATION ====
  setupEndPointAutocomplete(): void {
    const ctrl = this.form.get('endPoint');
    if (!ctrl) return;

    this.endPointSub = ctrl.valueChanges.pipe(
      debounceTime(450),
      distinctUntilChanged(),
      switchMap((value: string) => {
        if (!value || value.trim().length < 3) {
          this.endPointSuggestions = [];
          return of([]);
        }
        this.isSearchingEndPoint = true;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value.trim())}&countrycodes=tn&format=json&limit=4&addressdetails=1&email=contact@matchmakers.tn`;
        return this.http.get<any[]>(url).pipe(catchError(() => of([])));
      })
    ).subscribe((results: any[]) => {
      this.isSearchingEndPoint = false;
      this.endPointSuggestions = results;
    });
  }

  selectEndPoint(suggestion: any): void {
    const shortName = suggestion.display_name.split(',').length >= 2 
      ? suggestion.display_name.split(',').slice(0, 2).join(',').trim() 
      : suggestion.display_name;
    this.form.get('endPoint')?.setValue(shortName, { emitEvent: false });
    this.endPointSuggestions = [];
  }

  onEndPointBlur(): void {
    setTimeout(() => this.endPointSuggestions = [], 250);
  }

  ngOnDestroy(): void {
    if (this.locationSub) this.locationSub.unsubscribe();
    if (this.startPointSub) this.startPointSub.unsubscribe();
    if (this.endPointSub) this.endPointSub.unsubscribe();
  }

  // ==== DISTANCES FORMARRAY ====
  get distancesControl(): FormArray {
    return this.form.get('distances') as FormArray;
  }

  addDistance(): void {
    this.distancesControl.push(this.fb.control('', Validators.min(0)));
  }

  removeDistance(index: number): void {
    if (this.distancesControl.length > 1) {
      this.distancesControl.removeAt(index);
    }
  }

  // ==== MAP LOGIC ====
  initMap(): void {
    if (this.map) return;
    
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    // Fix leaflet default marker icons path in Angular
    L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

    this.map = L.map('map').setView([33.8869, 9.5375], 6); // Default Tunisia center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => this.onMapClick(e));
  }

  onMapClick(e: L.LeafletMouseEvent): void {
    if (!this.mapMode || !this.map) return;

    if (this.mapMode === 'start') {
      this.startLatLng = e.latlng;
      this.mapMode = null; 
      this.updateRoute();
    } else if (this.mapMode === 'end') {
      this.endLatLng = e.latlng;
      this.mapMode = null; 
      this.updateRoute();
    } else if (this.mapMode === 'stop') {
      this.addStopByMapClick(e.latlng);
      this.mapMode = null; 
    }
  }

  addStopByMapClick(latlng: L.LatLng): void {
    if (this.routeLine.length < 2) return;
    
    let minDist = Infinity;
    let bestDistKm = 0;
    
    let currentKm = 0;
    for(let i=0; i<this.routeLine.length - 1; i++) {
       const p1 = this.routeLine[i];
       const p2 = this.routeLine[i+1];
       const segDist = p1.distanceTo(p2) / 1000;
       
       const distToP1 = latlng.distanceTo(p1);
       if (distToP1 < minDist) {
          minDist = distToP1;
          bestDistKm = currentKm;
       }
       currentKm += segDist;
    }
    
    // Add distance to the form
    const currentDistances = this.distancesControl.value
        .map((d: any) => parseFloat(d))
        .filter((d: any) => !isNaN(d));
    
    currentDistances.push(Number(bestDistKm.toFixed(2)));
    currentDistances.sort((a: number, b: number) => a - b);
    
    this.distancesControl.clear({ emitEvent: false });
    if (currentDistances.length > 0) {
        currentDistances.forEach((d: number) => this.distancesControl.push(this.fb.control(d, Validators.min(0)), { emitEvent: false }));
    } else {
        this.distancesControl.push(this.fb.control('', Validators.min(0)), { emitEvent: false });
    }
    this.drawStopMarkers();
  }

  updateRoute(): void {
    if (!this.map) return;
    
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }
    
    if (this.startMarker) { this.map.removeLayer(this.startMarker); this.startMarker = null; }
    if (this.endMarker) { this.map.removeLayer(this.endMarker); this.endMarker = null; }
    
    if (!this.startLatLng && !this.endLatLng) {
      this.totalRouteDistance = 0;
      this.routeLine = [];
      this.drawStopMarkers();
      return;
    }

    if (this.startLatLng && !this.endLatLng) {
       this.startMarker = L.marker([this.startLatLng.lat, this.startLatLng.lng], { title: 'Départ' }).addTo(this.map);
       this.reverseGeocode(this.startLatLng.lat, this.startLatLng.lng, 'startPoint');
       this.totalRouteDistance = 0;
       this.routeLine = [];
       this.drawStopMarkers();
       return;
    }
    
    if (!this.startLatLng && this.endLatLng) {
       this.endMarker = L.marker([this.endLatLng.lat, this.endLatLng.lng], { title: 'Arrivée' }).addTo(this.map);
       this.reverseGeocode(this.endLatLng.lat, this.endLatLng.lng, 'endPoint');
       this.totalRouteDistance = 0;
       this.routeLine = [];
       this.drawStopMarkers();
       return;
    }

    // Both Start and End exist, draw route!
    this.reverseGeocode(this.startLatLng!.lat, this.startLatLng!.lng, 'startPoint');
    this.reverseGeocode(this.endLatLng!.lat, this.endLatLng!.lng, 'endPoint');

    // Prevent TypeScript error for Routing
    const routing: any = (L as any).Routing;
    
    this.routingControl = routing.control({
      waypoints: [this.startLatLng, this.endLatLng],
      routeWhileDragging: false,
      show: false, // hide instructions panel
      addWaypoints: false, // don't add waypoints by dragging lines
    }).addTo(this.map);

    this.routingControl.on('routesfound', (e: any) => {
      const routes = e.routes;
      const summary = routes[0].summary;
      this.totalRouteDistance = summary.totalDistance / 1000; // to km
      this.routeLine = routes[0].coordinates.map((c: any) => L.latLng(c.lat, c.lng));
      
      this.drawStopMarkers();
    });
  }

  drawStopMarkers(): void {
     if (!this.map) return;
     this.stopMarkers.forEach(m => this.map!.removeLayer(m));
     this.stopMarkers = [];
     
     if (this.routeLine.length < 2) return;
     
     const distances: number[] = this.distancesControl.value
        .map((d: any) => parseFloat(d))
        .filter((d: any) => !isNaN(d) && d > 0);
     
     distances.forEach(targetKm => {
         let currentKm = 0;
         let targetPoint = this.routeLine[0];
         for(let i=0; i<this.routeLine.length - 1; i++) {
             const p1 = this.routeLine[i];
             const p2 = this.routeLine[i+1];
             const segDis = p1.distanceTo(p2) / 1000;
             if (currentKm + segDis >= targetKm) {
                // Interpolate exact position
                const ratio = (targetKm - currentKm) / segDis;
                const lat = p1.lat + (p2.lat - p1.lat) * ratio;
                const lng = p1.lng + (p2.lng - p1.lng) * ratio;
                targetPoint = L.latLng(lat, lng);
                break;
             }
             currentKm += segDis;
         }
         
         // Custom icon for distance stop
         const iconHtml = `<div style="background:var(--accent); color:white; border-radius:50%; width:26px; height:26px; text-align:center; font-size:10px; font-weight:bold; line-height:22px; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3); margin-top:-13px; margin-left:-13px;">${targetKm}</div>`;
         const icon = L.divIcon({ className: 'stop-marker-icon', html: iconHtml });
         const m = L.marker(targetPoint, { icon }).addTo(this.map!);
         this.stopMarkers.push(m);
     });
  }

  reverseGeocode(lat: number, lng: number, controlName: string): void {
     const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&email=contact@matchmakers.tn`;
     this.http.get<any>(url).subscribe(res => {
         let name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`; 
         if (res && res.display_name) {
             const parts = res.display_name.split(',');
             name = parts.length >= 2 ? parts.slice(0, 2).join(',').trim() : res.display_name;
         }
         this.form.get(controlName)?.setValue(name, { emitEvent: false });
     }, err => {
         this.form.get(controlName)?.setValue(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, { emitEvent: false });
     });
  }

  undoLastPoint(): void {
    // If there are distances, remove the last one
    const distValues = this.distancesControl.value.filter((d: any) => d !== '' && d !== null);
    if (distValues.length > 0) {
        this.distancesControl.removeAt(distValues.length - 1);
        if (this.distancesControl.length === 0) {
            this.distancesControl.push(this.fb.control('', Validators.min(0)));
        }
        return;
    }
    // Otherwise fallback to removing End then Start
    if (this.endLatLng) {
        this.endLatLng = null;
        this.updateRoute();
        return;
    }
    if (this.startLatLng) {
        this.startLatLng = null;
        this.updateRoute();
        return;
    }
  }

  setMapMode(mode: 'start' | 'end' | 'stop'): void {
    if (this.mapMode === mode) {
      this.mapMode = null;
    } else {
      this.mapMode = mode;
    }
  }

  clearRoute(): void {
    if (this.routingControl && this.map) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }
    if (this.startMarker && this.map) this.map.removeLayer(this.startMarker);
    if (this.endMarker && this.map) this.map.removeLayer(this.endMarker);
    this.stopMarkers.forEach(m => {
      if (this.map) this.map.removeLayer(m);
    });
    
    this.startMarker = null;
    this.endMarker = null;
    this.stopMarkers = [];
    this.startLatLng = null;
    this.endLatLng = null;
    this.routeLine = [];
    this.totalRouteDistance = 0;
    this.mapMode = null;
    
    this.distancesControl.push(this.fb.control('', Validators.min(0)));
    this.form.patchValue({ startPoint: '', endPoint: '' });
  }

  updateTerrainMarkers(): void {
    if (!this.map) return;
    
    // Clear old markers
    this.terrainMarkers.forEach(m => this.map!.removeLayer(m));
    this.terrainMarkers = [];

    // Create custom icon for terrains
    const terrainIcon = L.divIcon({
      className: 'custom-terrain-marker',
      html: `<div style="background:var(--accent); width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 0 10px var(--accent);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    this.filteredTerrains.forEach(terrain => {
      if (terrain.latitude && terrain.longitude) {
        const m = L.marker([terrain.latitude, terrain.longitude], { icon: terrainIcon })
          .addTo(this.map!)
          .bindPopup(`<b>${terrain.nom}</b><br>${terrain.ville}<br><button style="background:var(--accent); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer; margin-top:5px;" onclick="window.dispatchEvent(new CustomEvent('selectTerrain', {detail: '${terrain.id}'}))">Choisir ce terrain</button>`);
        
        this.terrainMarkers.push(m);
      }
    });
  }

  /** Listener for map-based terrain selection */
  setupMapListeners(): void {
    window.addEventListener('selectTerrain', (e: any) => {
        const terrainId = e.detail;
        if (terrainId) {
            this.form.get('terrainId')?.setValue(terrainId);
            this.successMsg = 'Terrain sélectionné via la carte !';
            setTimeout(() => this.successMsg = '', 2000);
        }
    });
  }
}