import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sponsor, SponsorRequest, SponsorStatus, Campaign } from '../models/sponsor.model';

@Injectable({ providedIn: 'root' })
export class SponsorService {
  private base = 'http://localhost:8091/api/sponsors'; // adapter le port

  constructor(private http: HttpClient) {}

  create(req: SponsorRequest): Observable<Sponsor> {
    return this.http.post<Sponsor>(this.base, req);
  }

  update(id: string, req: SponsorRequest): Observable<Sponsor> {
    return this.http.put<Sponsor>(`${this.base}/${id}`, req);
  }

  getById(id: string): Observable<Sponsor> {
    return this.http.get<Sponsor>(`${this.base}/${id}`);
  }

  getByUserId(userId: string): Observable<Sponsor> {
    return this.http.get<Sponsor>(`${this.base}/user/${userId}`);
  }

  getAll(): Observable<Sponsor[]> {
    return this.http.get<Sponsor[]>(this.base);
  }

  getByStatus(status: SponsorStatus): Observable<Sponsor[]> {
    return this.http.get<Sponsor[]>(`${this.base}/status/${status}`);
  }

  approve(id: string): Observable<Sponsor> {
    return this.http.patch<Sponsor>(`${this.base}/${id}/approve`, {});
  }

  reject(id: string, adminNote: string): Observable<Sponsor> {
    return this.http.patch<Sponsor>(`${this.base}/${id}/reject`, { adminNote });
  }

  deactivate(id: string): Observable<Sponsor> {
    return this.http.patch<Sponsor>(`${this.base}/${id}/deactivate`, {});
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${id}`, { responseType: 'text' });
  }

  uploadLogo(id: string, logoUrl: string): Observable<Sponsor> {
    return this.http.patch<Sponsor>(`${this.base}/${id}/logo`, { logoUrl });
  }
}