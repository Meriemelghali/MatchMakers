import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import {
  Chart, RadarController, RadialLinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend
} from 'chart.js';
Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatchService } from '../services/match.service';
import { TerrainService } from '../../terrains/services/terrain.service';
import { TeamService, Team } from '../../features/teams/services/team.service';
import { GeminiAiService, MatchmakingSuggestion } from '../services/gemini-ai.service';
import { WeatherService, WeatherForecast } from '../services/weather.service';
import { MatchType } from '../models/match.model';
import { Terrain } from '../../terrains/models/terrain.model';

@Component({
    selector: 'app-match-form',
    templateUrl: './match-form.component.html',
    styleUrls: ['./match-form.component.css']
})
export class MatchFormComponent implements OnInit, OnDestroy, AfterViewChecked {
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
    private radarChart?: Chart;
    private radarNeedsRebuild = false;
    @ViewChild('radarCanvas') radarCanvas?: ElementRef<HTMLCanvasElement>;

    // Weather Guard state
    weatherForecast: WeatherForecast | null = null;
    weatherLoading  = false;
    weatherNoGps    = false;

    types: MatchType[] = ['AMICAL', 'CHAMPIONNAT', 'COUPE', 'TOURNOI'];

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private matchService: MatchService,
        private terrainService: TerrainService,
        private teamService: TeamService,
        private geminiAi: GeminiAiService,
        private weatherService: WeatherService
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
            next: (ts) => {
                this.terrains = ts.filter(t => t.statut === 'DISPONIBLE');
                // Re-fetch weather now that terrain list is available
                // (fixes race condition when user picked terrain before list loaded)
                this.fetchWeather();
            },
            error: () => console.error('Erreur chargement terrains')
        });

        this.teamService.getTeams().pipe(takeUntil(this.destroy$)).subscribe({
            next: (ts) => this.teams = ts,
            error: () => console.error('Erreur chargement équipes')
        });

        // Weather Guard: re-fetch whenever terrain or date changes
        this.form.get('terrainId')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.fetchWeather());
        this.form.get('dateDebut')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.fetchWeather());

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

    fetchWeather() {
        const terrainId: string | null = this.form.value.terrainId;
        const dateDebut: string        = this.form.value.dateDebut;

        // Reset all weather state
        this.weatherForecast = null;
        this.weatherNoGps    = false;

        if (!terrainId || !dateDebut) return;

        const terrain = this.terrains.find(t => t.id === terrainId);
        if (!terrain) return;

        // Terrain exists but has no GPS coordinates
        if (!terrain.latitude || !terrain.longitude) {
            this.weatherNoGps = true;
            return;
        }

        this.weatherLoading = true;
        this.weatherService
            .getForecast(terrain.latitude, terrain.longitude, dateDebut, terrain.typeSurface)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next:  f  => { this.weatherForecast = f; this.weatherLoading = false; },
                error: () => { this.weatherLoading = false; }
            });
    }

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
                    const a = res.analysis || '';
                    this.matchmakingAnalysis = a.includes('[') && a.includes('"teamName"') ? '' : a;
                    this.matchmakingLoading  = false;
                    this.radarNeedsRebuild   = true;
                },
                error: () => {
                    this.matchmakingError   = 'Erreur lors de la requête Gemini AI.';
                    this.matchmakingLoading = false;
                }
            });
    }

    ngAfterViewChecked() {
        if (this.radarNeedsRebuild && this.radarCanvas) {
            this.radarNeedsRebuild = false;
            this.buildRadar();
        }
    }

    private buildRadar() {
        if (!this.radarCanvas || !this.matchmakingSuggestions.length) return;
        this.radarChart?.destroy();

        const top  = this.matchmakingSuggestions[0];
        const home = this.form.value.equipe1 || 'Domicile';

        const toAxes = (score: number, seed: number): number[] => {
            const r = (n: number) => (Math.abs(Math.sin(seed * n * 7.3)) * 18) - 9;
            return [
                Math.round(Math.min(99, Math.max(30, score * 0.82 + r(1)))),
                Math.round(Math.min(99, Math.max(30, score * 0.76 + r(2)))),
                Math.round(Math.min(99, Math.max(30, score * 0.91 + r(3)))),
                Math.round(Math.min(99, Math.max(30, score * 0.88 + r(4)))),
                Math.round(Math.min(99, Math.max(30, score * 0.73 + r(5)))),
            ];
        };

        this.radarChart = new Chart(this.radarCanvas.nativeElement, {
            type: 'radar',
            data: {
                labels: ['Attaque', 'Défense', 'Forme', 'Expérience', 'Alchimie'],
                datasets: [
                    {
                        label: home,
                        data: [74, 68, 78, 72, 66],
                        backgroundColor: 'rgba(232,80,10,0.12)',
                        borderColor: '#E8500A',
                        pointBackgroundColor: '#E8500A',
                        pointBorderColor: '#fff',
                        pointRadius: 3,
                        borderWidth: 2,
                    },
                    {
                        label: top.teamName,
                        data: toAxes(top.score, top.score),
                        backgroundColor: 'rgba(124,58,237,0.12)',
                        borderColor: '#7c3aed',
                        pointBackgroundColor: '#7c3aed',
                        pointBorderColor: '#fff',
                        pointRadius: 3,
                        borderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                animation: { duration: 900, easing: 'easeOutQuart' },
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: 'rgba(255,255,255,0.55)', font: { size: 11, weight: 'bold' }, boxWidth: 10, padding: 16 },
                    },
                    tooltip: { enabled: true },
                },
                scales: {
                    r: {
                        min: 0, max: 100,
                        grid:        { color: 'rgba(255,255,255,0.07)' },
                        angleLines:  { color: 'rgba(255,255,255,0.07)' },
                        ticks:       { display: false, stepSize: 20 },
                        pointLabels: { color: 'rgba(255,255,255,0.5)', font: { size: 11, weight: 'bold' } },
                    },
                },
            },
        });
    }

    closeMatchmakingModal() {
        this.showMatchmakingModal = false;
        this.radarChart?.destroy();
        this.radarChart = undefined;
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
