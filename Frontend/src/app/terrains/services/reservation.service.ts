import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reservation, ReservationStatus } from '../models/terrain.model';

@Injectable({ providedIn: 'root' })
export class ReservationService {

    private base = `${environment.terrainServiceUrl}/reservations`;

    constructor(private http: HttpClient) { }

    getAll(): Observable<Reservation[]> {
        return this.http.get<Reservation[]>(this.base);
    }

    getById(id: string): Observable<Reservation> {
        return this.http.get<Reservation>(`${this.base}/${id}`);
    }

    getByTerrain(terrainId: string): Observable<Reservation[]> {
        return this.http.get<Reservation[]>(`${this.base}/terrain/${terrainId}`);
    }

    create(data: Partial<Reservation>): Observable<Reservation> {
        return this.http.post<Reservation>(this.base, data);
    }

    confirm(id: string): Observable<Reservation> {
        return this.http.patch<Reservation>(`${this.base}/${id}/confirmer`, null);
    }

    cancel(id: string): Observable<Reservation> {
        return this.http.patch<Reservation>(`${this.base}/${id}/annuler`, null);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }

    checkAvailability(terrainId: string, debut: string, fin: string): Observable<{ disponible: boolean }> {
        return this.http.get<{ disponible: boolean }>(`${this.base}/disponibilite`, {
            params: { terrainId, debut, fin }
        });
    }
}
