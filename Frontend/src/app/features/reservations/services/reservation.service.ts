import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface StatutReservation {
  value: | 'PENDING'
  | 'RESERVED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';
  label: string;
}

export interface Reservation {
  idReservation?: string;
  startTimeR: string;
  endTimeR: string;
  statutR: string;
  sportId: string;
  terrainId: string;
  idUser: string;
}

/** Matches TerrainDTO from TerrainService */
export interface BaseTerrain {
  id: string;
  nom: string;
  adresse?: string;
  ville?: string;
  typeSport?: string;
  prixParHeure?: number;
  statut?: string;
  capacite?: number;
}

/** Matches Sport entity from SportService */
export interface BaseSport {
  id: string;
  nameSport: string;
  minPlayers?: number;
  maxPlayers?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = environment.reservationServiceUrl;
  private terrainUrl = environment.terrainServiceUrl;
  private sportUrl = environment.sportServiceUrl;

  constructor(private http: HttpClient) { }

  /** GET /terrain → List<TerrainDTO> (plain array, not paginated) */
  getTerrains(): Observable<BaseTerrain[]> {
    return this.http.get<BaseTerrain[]>(this.terrainUrl);
  }

  /** GET /api/sports → List<Sport> (plain array, not paginated) */
  getSports(): Observable<BaseSport[]> {
    return this.http.get<BaseSport[]>(this.sportUrl);
  }

  getReservations(): Observable<Reservation[]> {
    return this.http.get<{ content: Reservation[] }>(this.apiUrl).pipe(
      map(response => response.content || [])
    );
  }

  getReservationById(id: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${id}`);
  }

  createReservation(reservation: Omit<Reservation, 'idReservation'>): Observable<Reservation> {
    return this.http.post<Reservation>(this.apiUrl, reservation);
  }

  updateReservation(id: string, reservation: Reservation): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/${id}`, reservation);
  }

  cancelReservation(reservation: Reservation): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/${reservation.idReservation}`, {
      ...reservation,
      statutR: 'CANCELLED'
    });
  }
}
