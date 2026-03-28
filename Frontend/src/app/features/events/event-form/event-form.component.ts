import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../../core/services/EventService/event.service';
import { CreateEventRequest, EventType, CompetitionFormat, StatutEvent } from '../event.model';
import { SportService } from '../../sports/services/sport.service';
import { TerrainService } from '../../../terrains/services/terrain.service'; 
import { Sport } from '../../../features/sports/sport.model'; 
import { Terrain } from '../../../terrains/models/terrain.model';
@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css']
})
export class EventFormComponent implements OnInit{

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
  selectedEventType: EventType | null = null;

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
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadEventTypes();
    this.loadSports();    // ← NOUVEAU
    this.loadTerrains();  // ← NOUVEAU

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
      format:          [null],

      // ── équipes (Friendly Match) ───────────────────────────────
      teamIds: [''],  // saisie séparée par virgules
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
        this.filteredTerrains = terrains; // ← init avec tous les terrains
      },
      error: () => console.warn('terrain-service indisponible')
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
          teamIds:         event.teamIds?.join(', '),
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
      this.form.get('format')?.setValidators(Validators.required);
      this.form.get('teamIds')?.clearValidators();
    } else if (this.selectedEventType?.requiresTeams) {
      this.form.get('teamIds')?.setValidators(Validators.required);
      this.form.get('competitionName')?.clearValidators();
      this.form.get('maxTeam')?.clearValidators();
      this.form.get('format')?.clearValidators();
    } else {
      this.form.get('competitionName')?.clearValidators();
      this.form.get('maxTeam')?.clearValidators();
      this.form.get('format')?.clearValidators();
      this.form.get('teamIds')?.clearValidators();
    }

    // mettre à jour la validation
    ['competitionName', 'maxTeam', 'format', 'teamIds'].forEach(field => {
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
      req.format  = v.format;
    }

    if (this.selectedEventType?.requiresTeams && !this.selectedEventType?.isCompetition) {
      req.teamIds = v.teamIds
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);
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
    // reset terrain selection
    this.form.get('terrainId')?.setValue('');

    if (!sportId) {
      this.filteredTerrains = this.terrains;
      return;
    }

    const selectedSport = this.sports.find(s => s.id === sportId);
    if (!selectedSport) {
      this.filteredTerrains = this.terrains;
      return;
    }

    const sportType = this.sportNameToType[selectedSport.nameSport];
    if (sportType) {
      this.filteredTerrains = this.terrains.filter(
        t => t.typeSport === sportType
      );
    } else {
      this.filteredTerrains = this.terrains;
    }
  }
}