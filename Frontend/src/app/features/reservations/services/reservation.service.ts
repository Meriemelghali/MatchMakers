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

export interface ReservationStats {
  totalReservations: number;
  confirmedReservations: number;
  pendingReservations: number;
  cancelledReservations: number;
  reservationsBySport: { [key: string]: number };
  reservationsByStatus: { [key: string]: number };
}

export interface TerrainRecommendation {
  terrain_id: string;
  score: number;
  raisons: string[];
  details: {
    score_meteo: number;
    score_charge: number;
    score_calendrier: number;
    score_heure: number;
    score_note: number;
  };
}

export interface RecommendationResponse {
  recommandations: TerrainRecommendation[];
}

export interface EvaluationResponse {
  score: number;
  verdict: string;
  raisons: string[];
  details: any;
}

export interface BestSlot {
  date_heure: string;
  score: number;
  raisons: string[];
}

export interface BestSlotsResponse {
  slots: BestSlot[];
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = environment.reservationServiceUrl;
  private terrainUrl = environment.terrainServiceUrl;
  private sportUrl = environment.sportServiceUrl;

  constructor(private http: HttpClient) { }

  /** GET /terrain/ → List<TerrainDTO> */
  getTerrains(): Observable<BaseTerrain[]> {
    return this.http.get<BaseTerrain[]>(`${this.terrainUrl}/`);
  }

  /** GET /api/sports → List<Sport> */
  getSports(): Observable<BaseSport[]> {
    return this.http.get<BaseSport[]>(`${this.sportUrl}/api/sports`);
  }

  getReservations(): Observable<Reservation[]> {
    return this.http.get<{ content: Reservation[] }>(this.apiUrl).pipe(
      map(response => response.content || [])
    );
  }

  getReservationById(id: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${id}`);
  }

  getReservationStats(userId: string): Observable<ReservationStats> {
    return this.http.get<ReservationStats>(`${this.apiUrl}/user/${userId}/stats`);
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

  deleteReservation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getRecommendations(dateTime: string): Observable<RecommendationResponse> {
    const baseUrl = this.apiUrl.replace('/api/reservations', '');
    return this.http.get<RecommendationResponse>(`${baseUrl}/api/recommendations?dateTime=${dateTime}`);
  }

  evaluateChoice(terrain: any, dateTime: string): Observable<EvaluationResponse> {
    const baseUrl = this.apiUrl.replace('/api/reservations', '');
    return this.http.post<EvaluationResponse>(`${baseUrl}/api/evaluate`, { terrain, date_heure: dateTime });
  }

  getBestSlots(terrain: any, baseDate: string): Observable<BestSlotsResponse> {
    const baseUrl = this.apiUrl.replace('/api/reservations', '');
    return this.http.post<BestSlotsResponse>(`${baseUrl}/api/best-slots`, { terrain, base_date: baseDate });
  }
}
