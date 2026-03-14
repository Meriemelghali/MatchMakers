import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReservationService } from '../services/reservation.service';
import { Reservation } from '../models/terrain.model';

@Component({
    selector: 'app-reservations-list',
    templateUrl: './reservations-list.component.html',
    styleUrls: ['./reservations-list.component.css']
})
export class ReservationsListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    reservations: Reservation[] = [];
    loading = false;
    error = '';

    constructor(private reservationService: ReservationService) { }

    ngOnInit() { this.load(); }
    ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

    load() {
        this.loading = true;
        this.reservationService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
            next: r => { this.reservations = r; this.loading = false; },
            error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
        });
    }

    confirm(id: string) {
        this.reservationService.confirm(id).pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
    }

    cancel(id: string) {
        if (!confirm('Annuler cette réservation ?')) return;
        this.reservationService.cancel(id).pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
    }

    delete(id: string) {
        if (!confirm('Supprimer définitivement cette réservation ?')) return;
        this.reservationService.delete(id).pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
    }

    formatDate(d?: string) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}
