import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Club } from '../models/club.model';
import { ClubCreateDto } from '../models/club-create.dto';
import { ClubResponseDto } from '../models/club-response.dto';

@Injectable({
  providedIn: 'root'
})
export class ClubService {
  private apiUrl = environment.clubServiceUrl;

  constructor(private http: HttpClient) { }

  getAll(): Observable<Club[]> {
    return this.http.get<Club[]>(this.apiUrl);
  }

  getById(id: string): Observable<Club> {
    return this.http.get<Club>(`${this.apiUrl}/${id}`);
  }

  getDetail(id: string): Observable<ClubResponseDto> {
    return this.http.get<ClubResponseDto>(`${this.apiUrl}/${id}/detail`);
  }

  getByOwner(ownerId: string): Observable<Club[]> {
    return this.http.get<Club[]>(`${this.apiUrl}/owner/${ownerId}`);
  }

  create(clubDto: ClubCreateDto, token: string): Observable<ClubResponseDto> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post<ClubResponseDto>(this.apiUrl, clubDto, { headers });
  }

  update(id: string, club: Club): Observable<Club> {
    return this.http.put<Club>(`${this.apiUrl}/${id}`, club);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadLogo(id: string, file: File): Observable<Club> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Club>(`${this.apiUrl}/${id}/logo`, formData);
  }

  saveLogoFromUrl(id: string, imageUrl: string): Observable<Club> {
    return this.http.post<Club>(`${this.apiUrl}/${id}/logo-url`, imageUrl);
  }

  addTeam(id: string, teamId: string): Observable<Club> {
    return this.http.post<Club>(`${this.apiUrl}/${id}/teams/${teamId}`, {});
  }

  removeTeam(id: string, teamId: string): Observable<Club> {
    return this.http.delete<Club>(`${this.apiUrl}/${id}/teams/${teamId}`);
  }
}
