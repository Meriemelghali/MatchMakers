import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  email: string;
  roles: string[];
  permissions: string[];
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8081/users/auth';

  constructor(private http: HttpClient) { }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request);
  }

  // Sauvegarder le token dans localStorage
  saveTokens(response: AuthResponse) {
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('userEmail', response.email);
    // Stocker tous les rôles pour le choix ultérieur
    const roles = response.roles || [];
    localStorage.setItem('availableRoles', JSON.stringify(roles));

    // Décode le JWT pour récupérer firstName + lastName + ID
    try {
      const payload = JSON.parse(atob(response.accessToken.split('.')[1]));
      localStorage.setItem('firstName', payload.firstName || '');
      localStorage.setItem('lastName', payload.lastName || '');
      localStorage.setItem('userEmail', payload.email || response.email || '');
      localStorage.setItem('userId', payload.id || payload.userId || payload.sub || '');
    } catch (e) { }
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  logout() {
    localStorage.clear();
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  register(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, payload);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, newPassword });
  }
}