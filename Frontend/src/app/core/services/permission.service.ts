import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Permission } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private apiUrl = `${environment.userServiceUrl}/users/api/permissions`;

  constructor(private http: HttpClient) { }

  getAllPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(this.apiUrl);
  }

  getPermissionById(id: string): Observable<Permission> {
    return this.http.get<Permission>(`${this.apiUrl}/${id}`);
  }

  createPermission(name: string, description: string): Observable<Permission> {
    return this.http.post<Permission>(this.apiUrl, { name, description });
  }

  updatePermission(id: string, name: string, description: string): Observable<Permission> {
    return this.http.put<Permission>(`${this.apiUrl}/${id}`, { name, description });
  }

  deletePermission(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
