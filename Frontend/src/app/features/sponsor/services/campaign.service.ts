import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Campaign, CampaignRequest } from '../models/sponsor.model';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private base = 'http://localhost:8091/api/campaigns';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(this.base);
  }

  getById(id: string): Observable<Campaign> {
    return this.http.get<Campaign>(`${this.base}/${id}`);
  }

  getBySponsor(sponsorId: string): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.base}/sponsor/${sponsorId}`);
  }

  getActive(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.base}/active`);
  }

  getActiveGlobal(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.base}/active/global`);
  }

  getActiveForProduct(productId: string): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.base}/active/product/${productId}`);
  }

  create(req: CampaignRequest): Observable<Campaign> {
    return this.http.post<Campaign>(this.base, req);
  }

  update(id: string, req: CampaignRequest): Observable<Campaign> {
    return this.http.put<Campaign>(`${this.base}/${id}`, req);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${id}`, { responseType: 'text' });
  }

  approve(id: string): Observable<Campaign> {
    return this.http.patch<Campaign>(`${this.base}/${id}/approve`, {});
  }

  reject(id: string, adminNote: string): Observable<Campaign> {
    return this.http.patch<Campaign>(`${this.base}/${id}/reject`, { adminNote });
  }

  pause(id: string): Observable<Campaign> {
    return this.http.patch<Campaign>(`${this.base}/${id}/pause`, {});
  }

  resume(id: string): Observable<Campaign> {
    return this.http.patch<Campaign>(`${this.base}/${id}/resume`, {});
  }

  trackView(id: string): Observable<Campaign> {
    return this.http.patch<Campaign>(`${this.base}/${id}/view`, {});
  }

  trackClick(id: string): Observable<Campaign> {
    return this.http.patch<Campaign>(`${this.base}/${id}/click`, {});
  }
}