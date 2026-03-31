import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ReservationService, BaseTerrain, BaseSport, Reservation } from '../services/reservation.service';

@Component({
  selector: 'app-reservation-form',
  templateUrl: './reservation-form.component.html',
  styleUrls: ['./reservation-form.component.css']
})
export class ReservationFormComponent implements OnInit {
  terrains: BaseTerrain[] = [];
  sports: BaseSport[] = [];
  isEdit = false;
  reservationId?: string;

  readonly statuts = [
    { value: 'PENDING', label: 'En attente' },
    { value: 'RESERVED', label: 'Réservée' },
    { value: 'CONFIRMED', label: 'Confirmée' },
    { value: 'CANCELLED', label: 'Annulée' },
    { value: 'COMPLETED', label: 'Terminée' },

  ];

  formData = {
    startTimeR: '',
    statutR: 'RESERVED',
    sportId: '',
    terrainId: '',
    idUser: '69c00a957c847937bd945001'
  };

  loadingData = true;
  loadError = false;
  loading = false;
  error = false;

  constructor(
    private reservationService: ReservationService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.reservationId = this.route.snapshot.params['id'];
    this.isEdit = !!this.reservationId;

    const sources: any = {
      terrains: this.reservationService.getTerrains(),
      sports: this.reservationService.getSports()
    };

    if (this.isEdit && this.reservationId) {
      sources.existingRes = this.reservationService.getReservationById(this.reservationId);
    }

    forkJoin(sources).subscribe({
      next: (data: any) => {
        this.terrains = data.terrains;
        this.sports = data.sports;

        if (this.isEdit && data.existingRes) {
          const res: Reservation = data.existingRes;
          this.formData = {
            startTimeR: res.startTimeR,
            statutR: res.statutR,
            sportId: res.sportId,
            terrainId: res.terrainId,
            idUser: res.idUser
          };
        }
        this.loadingData = false;
      },
      error: (err) => {
        console.error('Erreur chargement données:', err);
        this.loadError = true;
        this.loadingData = false;
      }
    });
  }

  /** Helper: display label for a terrain option */
  terrainLabel(terrain: BaseTerrain): string {
    const parts: string[] = [terrain.nom];
    if (terrain.ville) parts.push(terrain.ville);
    if (terrain.typeSport) parts.push(terrain.typeSport);
    if (terrain.prixParHeure !== undefined) parts.push(`${terrain.prixParHeure} €/h`);
    return parts.join(' — ');
  }

  onSubmit(): void {
    if (!this.formData.startTimeR || !this.formData.terrainId || !this.formData.sportId) return;

    const start = new Date(this.formData.startTimeR);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

    const payload: any = {
      startTimeR: start.toISOString().substring(0, 19),
      endTimeR: end.toISOString().substring(0, 19),
      statutR: this.formData.statutR,
      sportId: this.formData.sportId,
      terrainId: this.formData.terrainId,
      idUser: this.formData.idUser
    };

    this.loading = true;
    this.error = false;

    if (this.isEdit && this.reservationId) {
      this.reservationService.updateReservation(this.reservationId, payload).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/reservations']);
        },
        error: (err) => {
          console.error(err);
          this.error = true;
          this.loading = false;
        }
      });
    } else {
      this.reservationService.createReservation(payload).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/reservations']);
        },
        error: (err) => {
          console.error(err);
          this.error = true;
          this.loading = false;
        }
      });
    }
  }
}
