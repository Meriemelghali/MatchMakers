import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  phoneNumber?: string;
  favoriteSports?: string[];
  theme?: 'LIGHT' | 'DARK' | 'SYSTEM';
  profilePictureUrl?: string;
  avatar3dUrl?: string;
  fitnessLevel?: string;
  fitnessGoals?: string[];
  weight?: number;
  height?: number;
  fairPlayScore?: number;
  roles: string[];
  pendingSanctionMessage?: string;
  pendingSanctionType?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private userApiUrl = `${environment.userServiceUrl}/users/users`;
  private aiApiUrl = `${environment.userServiceUrl}/users/api/ai`;

  constructor(private http: HttpClient) { }

  getProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.userApiUrl}/${userId}`);
  }

  searchUserByQuery(query: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.userApiUrl}/search`, { params: { query } });
  }

  updateProfile(userId: string, profileData: any): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.userApiUrl}/${userId}/profile`, profileData);
  }

  changePassword(userId: string, passwordData: any): Observable<void> {
    return this.http.put<void>(`${this.userApiUrl}/${userId}/change-password`, passwordData);
  }

  clearSanctionMessage(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.aiApiUrl}/sanction/${userId}/message`);
  }

  // Activity fetching
  getUserTeams(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.teamServiceUrl}/user/${userId}`);
  }

  getUserEvents(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.eventServiceUrl}/user/${userId}`);
  }

  getUserClubs(userId: string): Observable<any[]> {
    // SportService handles clubs - Need to include /api/ segment
    return this.http.get<any[]>(`${environment.sportServiceUrl}/api/clubs/user/${userId}`);
  }
}
