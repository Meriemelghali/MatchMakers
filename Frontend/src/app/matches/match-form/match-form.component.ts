import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatchService } from '../services/match.service';
import { TerrainService } from '../../terrains/services/terrain.service';
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

    types: MatchType[] = ['AMICAL', 'CHAMPIONNAT', 'COUPE', 'TOURNOI'];

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private matchService: MatchService,
        private terrainService: TerrainService
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
