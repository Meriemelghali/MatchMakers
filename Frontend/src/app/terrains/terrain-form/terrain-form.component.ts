import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TerrainService } from '../services/terrain.service';
import { SportType, SurfaceType } from '../models/terrain.model';

@Component({
    selector: 'app-terrain-form',
    templateUrl: './terrain-form.component.html',
    styleUrls: ['./terrain-form.component.css']
})
export class TerrainFormComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    form!: FormGroup;
    isEdit = false;
    terrainId: string | null = null;
    loading = false;
    submitting = false;
    error = '';

    sports: SportType[] = ['FOOTBALL', 'BASKETBALL', 'TENNIS', 'VOLLEYBALL', 'FUTSAL', 'PADEL', 'RUGBY', 'HANDBALL'];
    surfaces: SurfaceType[] = ['GAZON_NATUREL', 'GAZON_SYNTHETIQUE', 'PARQUET', 'BETON', 'TERRE_BATTUE', 'TARTAN'];

    constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private terrainService: TerrainService) { }

    ngOnInit() {
        this.form = this.fb.group({
            nom: ['', Validators.required],
            adresse: ['', Validators.required],
            ville: ['', Validators.required],
            latitude: [null],
            longitude: [null],
            typeSport: ['', Validators.required],
            typeSurface: ['', Validators.required],
            capacite: [null],
            description: [''],
            contact: [''],
            prixParHeure: [null, Validators.min(0)],
            eclairage: [false],
            vestiaires: [false],
            parking: [false],
            tribunes: [false],
            bar: [false]
        });

        this.terrainId = this.route.snapshot.paramMap.get('id');
        this.isEdit = !!this.terrainId;

        if (this.isEdit) {
            this.loading = true;
            this.terrainService.getById(this.terrainId!).pipe(takeUntil(this.destroy$)).subscribe({
                next: t => { this.form.patchValue(t); this.loading = false; },
                error: () => { this.error = 'Terrain introuvable'; this.loading = false; }
            });
        }
    }

    ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

    get f() { return this.form.controls; }

    submit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting = true;
        const obs = this.isEdit
            ? this.terrainService.update(this.terrainId!, this.form.value)
            : this.terrainService.create(this.form.value);
        obs.pipe(takeUntil(this.destroy$)).subscribe({
            next: t => this.router.navigate(['/terrains', t.id]),
            error: err => { this.error = err.error?.message || 'Une erreur est survenue'; this.submitting = false; }
        });
    }
}
