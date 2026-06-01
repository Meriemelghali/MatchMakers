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

  resolveReclamation(id: string, comment: string = ''): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/resolve?adminComment=${encodeURIComponent(comment)}`, {});
  }

  createSanction(sanction: Sanction): Observable<Sanction> {
    return this.http.post<Sanction>(`${this.apiUrl}/sanctions`, sanction);
  }

  getAIStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/dashboard/stats`);
  }

  getAllReclamations(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(this.apiUrl);
  }

  deleteReclamation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
