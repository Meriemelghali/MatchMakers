import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Match, MatchEvent, MatchStatus, MatchType } from '../models/match.model';

@Injectable({ providedIn: 'root' })
export class MatchService {

    private base = environment.matchServiceUrl;

    constructor(private http: HttpClient) { }

    getAll(): Observable<Match[]> {
        return this.http.get<Match[]>(`${this.base}/`);
    }

    getById(id: string): Observable<Match> {
        return this.http.get<Match>(`${this.base}/${id}`);
    }

    create(data: Partial<Match>): Observable<Match> {
        return this.http.post<Match>(`${this.base}/`, data);
    }

    update(id: string, data: Partial<Match>): Observable<Match> {
        return this.http.put<Match>(`${this.base}/${id}`, data);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }

    updateScore(id: string, scoreEquipe1: number, scoreEquipe2: number): Observable<Match> {
        return this.http.patch<Match>(`${this.base}/${id}/score`, { scoreEquipe1, scoreEquipe2 });
    }

    updateStatus(id: string, statut: MatchStatus): Observable<Match> {
        return this.http.patch<Match>(`${this.base}/${id}/statut`, { statut });
    }

    filterByStatus(statut: MatchStatus): Observable<Match[]> {
        return this.http.get<Match[]>(`${this.base}/statut/${statut}`);
    }

    filterByType(type: MatchType): Observable<Match[]> {
        return this.http.get<Match[]>(`${this.base}/type/${type}`);
    }

    addEvent(matchId: string, event: Partial<MatchEvent>): Observable<Match> {
        return this.http.post<Match>(`${this.base}/${matchId}/evenements`, event);
    }

    getEvents(matchId: string): Observable<MatchEvent[]> {
        return this.http.get<MatchEvent[]>(`${this.base}/${matchId}/evenements`);
    }

    deleteEvent(matchId: string, eventId: string): Observable<Match> {
        return this.http.delete<Match>(`${this.base}/${matchId}/evenements/${eventId}`);
    }
    filterByTerrain(terrainId: string): Observable<Match[]> {
        return this.http.get<Match[]>(`${this.base}/terrain/${terrainId}`);
    }

    getTeamHistory(eq1: string, eq2: string): Observable<Match[]> {
        const params = new HttpParams().set('eq1', eq1).set('eq2', eq2);
        return this.http.get<Match[]>(`${this.base}/historique`, { params });
    }
}
