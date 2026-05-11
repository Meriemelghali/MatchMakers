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
  stats: any = null;
  loading = true;
  error = false;

  currentPage = 0;
  pageSize = 5;
  totalElements = 0;
  totalPages = 0;

  private readonly staticUserId = localStorage.getItem('userId') || '';

  constructor(private reservationService: ReservationService) { }

  ngOnInit(): void {
    this.fetchReservations();
  }

  statutLabels: Record<string, string> = {
    'PENDING': 'En attente',
    'RESERVED': 'Réservé',
    'CONFIRMED': 'Confirmé',
    'CANCELLED': 'Annulé',
    'COMPLETED': 'Terminé',
    'NO_SHOW': 'Non présenté'
  };

  fetchReservations(): void {
    this.loading = true;
    console.log('--- FETCHING RESERVATIONS ---');
    console.log('Requested Page:', this.currentPage);
    console.log('Requested Size:', this.pageSize);
    
    forkJoin({
      resPage: this.reservationService.getReservations(this.currentPage, this.pageSize),
      terrains: this.reservationService.getTerrains(),
      sports: this.reservationService.getSports(),
      stats: this.reservationService.getReservationStats(this.staticUserId)
    }).subscribe({
      next: (data: any) => {
        console.log('Backend Response Page:', data.resPage);
        this.reservations = data.resPage.content || [];
        this.totalElements = data.resPage.totalElements || 0;
        this.totalPages = data.resPage.totalPages || 0;
        
        console.log('List of Reservations (after sorting by backend):');
        this.reservations.forEach((r, i) => {
          console.log(`[${i}] ID: ${r.idReservation} | Time: ${r.startTimeR}`);
        });

        this.terrains = data.terrains;
        this.sports = data.sports;
        this.stats = data.stats;
        this.loading = false;
      },
      error: (err) => {
        console.error('Fetch Error:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  onPageChange(newPage: number): void {
    if (newPage >= 0 && newPage < this.totalPages) {
      this.currentPage = newPage;
      this.fetchReservations();
    }
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

  deleteReservation(id: string | undefined): void {
    if (!id) return;
    if (confirm('Voulez-vous vraiment supprimer définitivement cette réservation ?')) {
      this.reservationService.deleteReservation(id).subscribe({
        next: () => {
          this.fetchReservations();
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
        }
      });
    }
  }
}
