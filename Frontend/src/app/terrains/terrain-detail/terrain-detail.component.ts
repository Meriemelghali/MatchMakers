import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TerrainService } from '../services/terrain.service';
import { ReservationService } from '../services/reservation.service';
import { Terrain, Reservation, TerrainStatus } from '../models/terrain.model';

@Component({
    selector: 'app-terrain-detail',
    templateUrl: './terrain-detail.component.html',
    styleUrls: ['./terrain-detail.component.css']
})
export class TerrainDetailComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    terrain?: Terrain;
    reservations: Reservation[] = [];
    loading = false;
    error = '';

    availabilityForm!: FormGroup;
    availabilityResult: boolean | null = null;
    checkingAvail = false;

    statuses: TerrainStatus[] = ['DISPONIBLE', 'OCCUPE', 'MAINTENANCE', 'FERME'];

    sportIcons: Record<string, string> = {
        FOOTBALL: '⚽', BASKETBALL: '🏀', TENNIS: '🎾', VOLLEYBALL: '🏐',
        FUTSAL: '⚽', PADEL: '🏸', RUGBY: '🏉', HANDBALL: '🤾'
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private terrainService: TerrainService,
        private reservationService: ReservationService
    ) { }

    ngOnInit() {
        this.availabilityForm = this.fb.group({
            debut: ['', Validators.required],
            fin: ['', Validators.required]
        });

        this.load();
    }

    ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

    load() {
        const id = this.route.snapshot.paramMap.get('id')!;
        this.loading = true;
        this.terrainService.getById(id).pipe(takeUntil(this.destroy$)).subscribe({
            next: t => {
                this.terrain = t;
                this.loadReservations(id);
                this.loading = false;
            },
            error: () => { this.error = 'Terrain introuvable'; this.loading = false; }
        });
    }

    loadReservations(id: string) {
        this.reservationService.getByTerrain(id).pipe(takeUntil(this.destroy$)).subscribe({
            next: r => this.reservations = r,
            error: () => { }
        });
    }

    changeStatus(s: TerrainStatus) {
        if (!this.terrain?.id) return;
        this.terrainService.changeStatus(this.terrain.id, s).pipe(takeUntil(this.destroy$))
            .subscribe(t => this.terrain = t);
    }

    checkAvailability() {
        if (this.availabilityForm.invalid || !this.terrain?.id) return;
        this.checkingAvail = true;
        const { debut, fin } = this.availabilityForm.value;
        this.reservationService.checkAvailability(this.terrain.id, debut, fin)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: r => { this.availabilityResult = r.disponible; this.checkingAvail = false; },
                error: () => { this.checkingAvail = false; }
            });
    }

    confirmReservation(id: string) {
        this.reservationService.confirm(id).pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
    }

    cancelReservation(id: string) {
        if (!confirm('Annuler cette réservation ?')) return;
        this.reservationService.cancel(id).pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
    }


    formatDate(d?: string) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}
