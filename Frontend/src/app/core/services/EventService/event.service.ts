import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Event, StatutEvent } from '../../../features/events/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private readonly API = 'http://localhost:8083/eventsCompetitions/api/events';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Event[]> {
    return this.http.get<Event[]>(this.API);
  }

  getByStatut(statut: StatutEvent): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.API}/statut/${statut}`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
