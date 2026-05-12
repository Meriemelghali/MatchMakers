import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ThemeService, ThemeType } from '../ThemeService/theme.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  email: string;
  roles: string[];
  permissions: string[];
  theme?: string;
  requiresMfaChoice?: boolean;
  requires2FA?: boolean;
  twoFactorType?: string;
  qrCodeImageBase64?: string;
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8081/users/auth';

  constructor(
    private http: HttpClient,
    private themeService: ThemeService
  ) { }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request);
  }

  // --- 2FA Endpoints ---
  setup2Fa(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/setup-2fa`, payload);
  }

  verifySetup2Fa(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-setup-2fa`, payload);
  }

  verify2Fa(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-2fa`, payload);
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
      localStorage.setItem('userId', payload.id || payload.userId || payload.sub || '');
    } catch (e) { }
      localStorage.setItem('userEmail', payload.email || response.email || '');
      localStorage.setItem('userId', payload.id || payload.userId || payload.sub || '');
    } catch (e) { }

    if (response.theme) {
      this.themeService.setTheme(response.theme as ThemeType, true);
    }
  }

  saveTokensAndRedirect(response: AuthResponse, router: import('@angular/router').Router) {
    this.saveTokens(response);
    const roles = response.roles || [];
    
    if (roles.length > 1) {
      router.navigate(['/role-selection']);
    } else {
      const role = roles.length === 1 ? roles[0] : 'SPORTIF';
      localStorage.setItem('userRole', role);
      
      if (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'ROLE_ADMIN') {
        router.navigate(['/admin-choice']);
      } else {
        router.navigate(['/events']);
      }
    }
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  logout() {
    this.themeService.setTheme('DARK', false);
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