import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ReservationService, Reservation, BaseTerrain, BaseSport } from '../services/reservation.service';

@Component({
  selector: 'app-reservations-list',
  templateUrl: './reservations-list.component.html',
  styleUrls: ['./reservations-list.component.css']
})
export class ReservationsListComponent implements OnInit {
  reservations: Reservation[] = [];
  terrains: BaseTerrain[] = [];
  sports: BaseSport[] = [];
  loading = true;
  error = false;

  constructor(private reservationService: ReservationService) { }

  ngOnInit(): void {
    this.fetchReservations();
  }

  fetchReservations(): void {
    this.loading = true;
    forkJoin({
      reservations: this.reservationService.getReservations(),
      terrains: this.reservationService.getTerrains(),
      sports: this.reservationService.getSports()
    }).subscribe({
      next: (data) => {
        this.reservations = data.reservations;
        this.terrains = data.terrains;
        this.sports = data.sports;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  getTerrainName(id: string): string {
    const terrain = this.terrains.find(t => t.id === id);
    return terrain ? `${terrain.nom} (${terrain.ville || ''})` : `Terrain #${id}`;
  }

  getSportName(id: string): string {
    const sport = this.sports.find(s => s.id === id);
    return sport ? sport.nameSport : `Sport #${id}`;
  }

  cancel(reservation: Reservation): void {
    if (!reservation.idReservation) return;
    if (confirm('Annuler cette réservation ?')) {
      this.reservationService.cancelReservation(reservation).subscribe({
        next: () => this.fetchReservations(),
        error: (err) => console.error(err)
      });
    }
  }
}
