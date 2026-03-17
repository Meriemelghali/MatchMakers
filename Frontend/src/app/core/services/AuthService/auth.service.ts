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
    // Rôle depuis le tableau roles
    const role = response.roles?.length > 0 ? response.roles[0] : 'Admin';
    localStorage.setItem('userRole', role);

    // Décode le JWT pour récupérer firstName + lastName
    try {
      const payload = JSON.parse(atob(response.accessToken.split('.')[1]));
      localStorage.setItem('firstName', payload.firstName || '');
      localStorage.setItem('lastName', payload.lastName || '');
    } catch(e) {}
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
}