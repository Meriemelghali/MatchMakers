import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Event, StatutEvent, CreateEventRequest, UpdateEventRequest, EventType } from '../../../features/events/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private readonly API = 'http://localhost:8083/eventsCompetitions/api/events';
  private readonly TYPES_API = 'http://localhost:8083/eventsCompetitions/api/event-types';

  constructor(private http: HttpClient) {}

  //Crud
  getAll(): Observable<Event[]> {
    return this.http.get<Event[]>(this.API);
  }
  getById(id: string): Observable<Event> {
    return this.http.get<Event>(`${this.API}/${id}`);
  }
  create(dto: CreateEventRequest): Observable<Event> {
    return this.http.post<Event>(this.API, dto);
  }
  update(id: string, dto: UpdateEventRequest): Observable<Event> {
    return this.http.put<Event>(`${this.API}/${id}`, dto);
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  //Filtres
  getByStatut(statut: StatutEvent): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.API}/statut/${statut}`);
  }
  getByLocation(city: string): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.API}/location`, {
      params: new HttpParams().set('city', city)
    });
  }
  getByLocationPlanned(city: string): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.API}/location/planned`, {
      params: new HttpParams().set('city', city)
    });
  }
  getByOrganizer(userId: string): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.API}/organizer/${userId}`);
  }
  // Statut
  changeStatut(id: string, statut: StatutEvent): Observable<Event> {
    return this.http.patch<Event>(`${this.API}/${id}/statut`, null, {
      params: new HttpParams().set('statut', statut)
    });
  }
  // Équipes 
  joinTeam(eventId: string, teamId: string): Observable<Event> {
    return this.http.post<Event>(`${this.API}/${eventId}/teams/${teamId}`, {});
  }
  leaveTeam(eventId: string, teamId: string): Observable<Event> {
    return this.http.delete<Event>(`${this.API}/${eventId}/teams/${teamId}`);
  }
  // Participants individuels
  joinEvent(id: string): Observable<Event> {
    return this.http.post<Event>(`${this.API}/${id}/join`, {});
  }
  leaveEvent(id: string): Observable<Event> {
    return this.http.delete<Event>(`${this.API}/${id}/leave`);
  }
  // Event Types
  getEventTypes(): Observable<EventType[]> {
    return this.http.get<EventType[]>(this.TYPES_API);
  }
  createEventType(type: Partial<EventType>): Observable<EventType> {
    return this.http.post<EventType>(this.TYPES_API, type);
  }

  deleteEventType(id: string): Observable<void> {
    return this.http.delete<void>(`${this.TYPES_API}/${id}`);
  }
}