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

  private getLocalISOString(date: Date): string {
    const pad = (num: number) => String(num).padStart(2, '0');
    return date.getFullYear() + '-' +
      pad(date.getMonth() + 1) + '-' +
      pad(date.getDate()) + 'T' +
      pad(date.getHours()) + ':' +
      pad(date.getMinutes());
  }

  formDate = this.getLocalISOString(new Date()).substring(0, 10);
  formTime = this.getLocalISOString(new Date()).substring(11, 16);

  formData = {
    startTimeR: '',
    statutR: 'RESERVED',
    sportId: '',
    terrainId: '',
    idUser: localStorage.getItem('userId') || ''
  };

  showCalendar = false;

  loadingData = true;
  loadError = false;
  loading = false;
  error = false;
  errorMessage = '';
  dateInPast = false;

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
          this.formDate = res.startTimeR.substring(0, 10);
          this.formTime = res.startTimeR.substring(11, 16);
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

  /** Appelé quand le Smart Calendar sélectionne un créneau */
  onCalendarSlotSelected(event: { terrainId: string; dateTime: string }): void {
    this.formData.terrainId = event.terrainId;
    this.formDate = event.dateTime.substring(0, 10);
    this.formTime = event.dateTime.substring(11, 16);
    this.showCalendar = false;
  }

  toggleCalendar(): void {
    this.showCalendar = !this.showCalendar;
  }

  getSelectedSportName(): string {
    return this.sports.find(s => s.id === this.formData.sportId)?.nameSport || '';
  }

  onSubmit(): void {
    // Combine date and time
    this.formData.startTimeR = `${this.formDate}T${this.formTime}`;

    if (!this.formData.startTimeR || !this.formData.terrainId || !this.formData.sportId) return;

    this.dateInPast = false;
    // Manually parse to ensure local time comparison
    const [datePart, timePart] = this.formData.startTimeR.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    const start = new Date(year, month - 1, day, hours, minutes);
    
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMilliseconds(0);

    console.log('--- DEBUG DATE VALIDATION ---');
    console.log('Input string:', this.formData.startTimeR);
    console.log('Parsed start date:', start.toString());
    console.log('Current date (now):', now.toString());
    console.log('Comparison: ' + start.getTime() + ' < ' + now.getTime());

    if (start.getTime() < now.getTime()) {
      console.log('Result: IN THE PAST');
      this.dateInPast = true;
      return;
    }
    console.log('Result: VALID');
    
    const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

    const payload: any = {
      startTimeR: this.getLocalISOString(start),
      endTimeR: this.getLocalISOString(end),
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
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour.';
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
          this.errorMessage = err.error?.message || 'Erreur lors de l\'enregistrement. Veuillez vérifier les disponibilités.';
          this.loading = false;
        }
      });
    }
  }
}
