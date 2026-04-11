import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatchService } from '../services/match.service';
import { GeminiAiService } from '../services/gemini-ai.service';
import { Match, MatchStatus, EventType } from '../models/match.model';
import { TerrainService } from '../../terrains/services/terrain.service';

@Component({
    selector: 'app-match-detail',
    templateUrl: './match-detail.component.html',
    styleUrls: ['./match-detail.component.css']
})
export class MatchDetailComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    match?: Match;
    loading = false;
    error = '';
    updating = false;
    terrainName?: string;

    eventForm!: FormGroup;
    showEventForm = false;

    // AI Summary state
    summaryLoading = false;
    summaryText    = '';
    summaryError   = '';
    summaryFromLlm = false;

    eventTypes: EventType[] = ['BUT', 'CARTON_JAUNE', 'CARTON_ROUGE', 'REMPLACEMENT', 'ARRET', 'HORS_JEU', 'PENALTY', 'DEBUT_MI_TEMPS', 'FIN_MI_TEMPS'];
    statusTransitions: Record<string, MatchStatus[]> = {
        PLANIFIE: ['EN_COURS', 'ANNULE', 'REPORTE'],
        EN_COURS: ['TERMINE', 'ANNULE'],
        REPORTE: ['PLANIFIE', 'ANNULE'],
        TERMINE: [],
        ANNULE: []
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private matchService: MatchService,
        private sanitizer: DomSanitizer,
        private terrainService: TerrainService,
        private geminiAi: GeminiAiService
    ) { }

    ngOnInit() {
        this.eventForm = this.fb.group({
            type: ['', Validators.required],
            minute: [null, [Validators.required, Validators.min(0), Validators.max(120)]],
            joueur: [''],
            equipe: [''],
            description: ['']
        });

        this.load();
    }

    ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

    load() {
        const id = this.route.snapshot.paramMap.get('id')!;
        this.loading = true;
        this.matchService.getById(id).pipe(takeUntil(this.destroy$)).subscribe({
            next: m => {
                this.match = m;
                this.loading = false;
                if (m.terrainId) {
                    this.terrainService.getById(m.terrainId).pipe(takeUntil(this.destroy$)).subscribe({
                        next: t => this.terrainName = t.nom,
                        error: () => this.terrainName = 'Terrain inconnu'
                    });
                }
            },
            error: () => { this.error = 'Match introuvable'; this.loading = false; }
        });
    }

    get availableStatuses(): MatchStatus[] {
        return this.statusTransitions[this.match?.statut || ''] || [];
    }

    changeStatus(s: MatchStatus) {
        if (!this.match?.id) return;
        this.matchService.updateStatus(this.match.id, s).pipe(takeUntil(this.destroy$)).subscribe(m => this.match = m);
    }

    submitEvent() {
        if (this.eventForm.invalid || !this.match?.id) return;
        this.updating = true;
        this.matchService.addEvent(this.match.id, this.eventForm.value).pipe(takeUntil(this.destroy$)).subscribe({
            next: m => { this.match = m; this.eventForm.reset(); this.showEventForm = false; this.updating = false; },
            error: err => { this.error = err.error?.message || 'Erreur'; this.updating = false; }
        });
    }

    deleteEvent(eventId: string) {
        if (!this.match?.id || !confirm('Supprimer cet événement ?')) return;
        this.matchService.deleteEvent(this.match.id, eventId).pipe(takeUntil(this.destroy$)).subscribe(m => this.match = m);
    }

    generateSummary() {
        if (!this.match) return;
        this.summaryLoading = true;
        this.summaryText    = '';
        this.summaryError   = '';
        this.geminiAi.generateMatchSummary(this.match)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.summaryText    = res.summary;
                    this.summaryFromLlm = res.from_llm;
                    this.summaryLoading = false;
                },
                error: () => {
                    this.summaryError   = 'Erreur lors de la génération du résumé.';
                    this.summaryLoading = false;
                }
            });
    }

    getIconClass(type: string): string {
        if (type === 'BUT' || type === 'PENALTY') return 'icon-but';
        if (type === 'CARTON_JAUNE') return 'icon-carton-j';
        if (type === 'CARTON_ROUGE') return 'icon-carton-r';
        return 'icon-default';
    }

    getSvgIcon(type: string): SafeHtml {
        let svg = '';
        if (type === 'BUT' || type === 'PENALTY') {
            svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
        } else if (type === 'CARTON_JAUNE' || type === 'CARTON_ROUGE') {
            svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="16" rx="2"/></svg>`;
        } else if (type === 'REMPLACEMENT') {
            svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 11-4-4-4 4"/><path d="M10 7v10"/><path d="m10 13 4 4 4-4"/><path d="M14 17V7"/></svg>`;
        } else {
            svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>`;
        }
        return this.sanitizer.bypassSecurityTrustHtml(svg);
    }

    formatDate(d?: string) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}
