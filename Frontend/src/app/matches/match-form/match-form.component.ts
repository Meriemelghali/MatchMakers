import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatchService } from '../services/match.service';
import { TerrainService } from '../../terrains/services/terrain.service';
import { TeamService, Team } from '../../features/teams/services/team.service';
import { GeminiAiService, MatchmakingSuggestion } from '../services/gemini-ai.service';
import { MatchType } from '../models/match.model';
import { Terrain } from '../../terrains/models/terrain.model';

@Component({
    selector: 'app-match-form',
    templateUrl: './match-form.component.html',
    styleUrls: ['./match-form.component.css']
})
export class MatchFormComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    form!: FormGroup;
    isEdit = false;
    matchId: string | null = null;
    loading = false;
    submitting = false;
    error = '';
    terrains: Terrain[] = [];
    teams: Team[] = [];

    // AI matchmaking state
    showMatchmakingModal = false;
    matchmakingLoading   = false;
    matchmakingError     = '';
    matchmakingSuggestions: MatchmakingSuggestion[] = [];
    matchmakingAnalysis  = '';

    types: MatchType[] = ['AMICAL', 'CHAMPIONNAT', 'COUPE', 'TOURNOI'];

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private matchService: MatchService,
        private terrainService: TerrainService,
        private teamService: TeamService,
        private geminiAi: GeminiAiService
    ) { }

    ngOnInit() {
        this.form = this.fb.group({
            titre: ['', [Validators.required, Validators.minLength(3)]],
            equipe1: ['', Validators.required],
            equipe2: ['', Validators.required],
            dateDebut: ['', Validators.required],
            dateFin: ['', Validators.required],
            type: ['', Validators.required],
            arbitre: [''],
            description: [''],
            capaciteSpectateurs: [null],
            terrainId: [null]
        });

        this.matchId = this.route.snapshot.paramMap.get('id');
        this.isEdit = !!this.matchId;

        this.terrainService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
            next: (ts) => this.terrains = ts.filter(t => t.statut === 'DISPONIBLE'),
            error: () => console.error('Erreur chargement terrains')
        });

        this.teamService.getTeams().pipe(takeUntil(this.destroy$)).subscribe({
            next: (ts) => this.teams = ts,
            error: () => console.error('Erreur chargement équipes')
        });

        if (this.isEdit) {
            this.loading = true;
            this.matchService.getById(this.matchId!).pipe(takeUntil(this.destroy$)).subscribe({
                next: m => {
                    this.form.patchValue({
                        ...m,
                        dateDebut: m.dateDebut?.slice(0, 16),
                        dateFin: m.dateFin?.slice(0, 16)
                    });
                    this.loading = false;
                },
                error: () => { this.error = 'Match introuvable'; this.loading = false; }
            });
        }
    }

    ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

    get f() { return this.form.controls; }

    /** Return all teams except the one currently selected as equipe1 */
    get candidateTeams(): Team[] {
        const selected = this.form.value.equipe1;
        return this.teams.filter(t => t.name !== selected);
    }

    /** Called when the user clicks the AI Matchmaking button */
    runMatchmaking() {
        const selectedName: string = this.form.value.equipe1;
        if (!selectedName) return;

        const team1 = this.teams.find(t => t.name === selectedName);
        if (!team1) return;

        const candidates = this.candidateTeams;
        if (candidates.length === 0) return;

        this.showMatchmakingModal   = true;
        this.matchmakingLoading     = true;
        this.matchmakingError       = '';
        this.matchmakingSuggestions = [];
        this.matchmakingAnalysis    = '';

        this.geminiAi.findBestOpponents(team1, candidates)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.matchmakingSuggestions = res.suggestions;
                    // Guard: never display raw JSON in the analysis
                    const a = res.analysis || '';
                    this.matchmakingAnalysis = a.includes('[') && a.includes('"teamName"') ? '' : a;
                    this.matchmakingLoading  = false;
                },
                error: () => {
                    this.matchmakingError   = 'Erreur lors de la requête Gemini AI.';
                    this.matchmakingLoading = false;
                }
            });
    }

    closeMatchmakingModal() {
        this.showMatchmakingModal = false;
    }

    /** Apply a suggested opponent to equipe2 and close the modal */
    applySuggestion(suggestion: MatchmakingSuggestion) {
        this.form.patchValue({ equipe2: suggestion.teamName });
        this.showMatchmakingModal   = false;
        this.matchmakingSuggestions = [];
        this.matchmakingAnalysis    = '';
    }

    /** Returns the ring stroke color based on score */
    scoreColor(score: number): string {
        if (score >= 70) return '#7c3aed';
        if (score >= 40) return '#f59e0b';
        return '#6b7280';
    }

    /** Returns the SVG stroke-dasharray for the score ring (circumference = 100) */
    scoreDash(score: number): string {
        return `${score} 100`;
    }

    submit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting = true;
        const payload = { ...this.form.value };

        const obs = this.isEdit
            ? this.matchService.update(this.matchId!, payload)
            : this.matchService.create(payload);

        obs.pipe(takeUntil(this.destroy$)).subscribe({
            next: m => this.router.navigate(['/matches', m.id]),
            error: err => { this.error = err.error?.message || 'Une erreur est survenue'; this.submitting = false; }
        });
    }
}
