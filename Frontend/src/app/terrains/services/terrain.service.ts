import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Terrain, TerrainStatus, SportType, TimeSlot } from '../models/terrain.model';

@Injectable({ providedIn: 'root' })
export class TerrainService {

    private base = environment.terrainServiceUrl;

    constructor(private http: HttpClient) { }

    getAll(): Observable<Terrain[]> {
        return this.http.get<Terrain[]>(`${this.base}/`);
    }

    getById(id: string): Observable<Terrain> {
        return this.http.get<Terrain>(`${this.base}/${id}`);
    }

    create(data: Partial<Terrain>): Observable<Terrain> {
        return this.http.post<Terrain>(`${this.base}/`, data);
    }

    update(id: string, data: Partial<Terrain>): Observable<Terrain> {
        return this.http.put<Terrain>(`${this.base}/${id}`, data);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }

    changeStatus(id: string, statut: TerrainStatus): Observable<Terrain> {
        return this.http.patch<Terrain>(`${this.base}/${id}/statut`, null, { params: { statut } });
    }

    filterBySport(typeSport: SportType): Observable<Terrain[]> {
        return this.http.get<Terrain[]>(`${this.base}/sport/${typeSport}`);
    }

    filterByStatus(statut: TerrainStatus): Observable<Terrain[]> {
        return this.http.get<Terrain[]>(`${this.base}/statut/${statut}`);
    }

    filterByCity(ville: string): Observable<Terrain[]> {
        return this.http.get<Terrain[]>(`${this.base}/ville/${encodeURIComponent(ville)}`);
    }

    updateSchedule(id: string, creneaux: TimeSlot[]): Observable<Terrain> {
        return this.http.put<Terrain>(`${this.base}/${id}/creneaux`, creneaux);
    }

    uploadPhoto(id: string, file: File): Observable<Terrain> {
        const fd = new FormData();
        fd.append('file', file);
        return this.http.post<Terrain>(`${this.base}/${id}/photos`, fd);
    }

    deletePhoto(id: string, filename: string): Observable<Terrain> {
        return this.http.delete<Terrain>(`${this.base}/${id}/photos/${filename}`);
    }
}
