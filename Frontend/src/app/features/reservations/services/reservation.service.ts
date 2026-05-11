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
  typeSurface?: string;
  prixParHeure?: number;
  statut?: string;
  capacite?: number;
  eclairage?: boolean;
  vestiaires?: boolean;
  parking?: boolean;
  tribunes?: boolean;
  bar?: boolean;
  latitude?: number;
  longitude?: number;
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


export interface EvaluationResponse {
  score: number;
  verdict: string;
  raisons: string[];
  details: any;
}

export interface BestSlot {
  date_heure: string;
  score: number;
  verdict: string;
  raisons: string[];
}

export interface BestSlotsResponse {
  slots: BestSlot[];
}

/** NOUVEAU: Heatmap types */
export interface HeatmapSlot {
  date: string;
  hour: number;
  score: number;
  available: boolean;
  verdict: string;
}

export interface HeatmapEntry {
  terrain_id: string;
  slots: HeatmapSlot[];
}

export interface HeatmapResponse {
  heatmap: HeatmapEntry[];
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

  getReservations(page: number = 0, size: number = 5): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?page=${page}&size=${size}&sort=startTimeR,desc`);
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


  evaluateChoice(terrain: any, dateTime: string): Observable<EvaluationResponse> {
    const baseUrl = this.apiUrl.replace('/api/reservations', '');
    return this.http.post<EvaluationResponse>(`${baseUrl}/api/evaluate`, { terrain, date_heure: dateTime });
  }

  getBestSlots(terrain: any, baseDate: string): Observable<BestSlotsResponse> {
    const baseUrl = this.apiUrl.replace('/api/reservations', '');
    return this.http.post<BestSlotsResponse>(`${baseUrl}/api/best-slots`, { terrain, base_date: baseDate });
  }

  /** NOUVEAU: Heatmap de disponibilités multi-terrain */
  getHeatmap(params: {
    startDate: string;
    days?: number;
    sportType?: string;
    userId?: string;
    terrainIds?: string[];
  }): Observable<HeatmapResponse> {
    const baseUrl = this.apiUrl.replace('/api/reservations', '');
    let httpParams: any = { startDate: params.startDate };
    if (params.days)       httpParams['days']       = params.days;
    if (params.sportType)  httpParams['sportType']  = params.sportType;
    if (params.userId)     httpParams['userId']     = params.userId;
    if (params.terrainIds?.length) httpParams['terrainIds'] = params.terrainIds;
    return this.http.get<HeatmapResponse>(`${baseUrl}/api/recommendations/heatmap`, { params: httpParams });
  }
}

