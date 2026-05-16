import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reclamation, Sanction } from '../models/reclamation.model';

@Injectable({
  providedIn: 'root'
})
export class ReclamationService {
  private apiUrl = environment.reclamationServiceUrl;

  constructor(private http: HttpClient) { }

  createReclamation(reclamation: Reclamation): Observable<Reclamation> {
    return this.http.post<Reclamation>(this.apiUrl, reclamation);
  }

  getReclamationsByUserId(userId: string): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/user/${userId}`);
  }

  getUrgentReclamations(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/admin/dashboard/urgentes`);
  }

  getUserSanctions(userId: string): Observable<Sanction[]> {
    return this.http.get<Sanction[]>(`${this.apiUrl}/sanctions/user/${userId}`);
  }
}
