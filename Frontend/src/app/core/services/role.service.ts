import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Role } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = `${environment.userServiceUrl}/users/api/roles`;

  constructor(private http: HttpClient) { }

  getAllRoles(): Observable<Role[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      tap(res => console.log('Raw Role API Response:', res)),
      map(res => {
        if (Array.isArray(res)) return res;
        if (res && res.content) return res.content;
        return [];
      })
    );
  }

  getRoleById(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/${id}`);
  }

  createRole(name: string, description: string): Observable<Role> {
    return this.http.post<Role>(this.apiUrl, { name, description });
  }

  updateRole(id: string, name: string, description: string): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/${id}`, { name, description });
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addPermissionsToRole(roleId: string, permissionIds: string[]): Observable<Role> {
    return this.http.post<Role>(`${this.apiUrl}/${roleId}/permissions`, permissionIds);
  }

  removePermissionsFromRole(roleId: string, permissionIds: string[]): Observable<Role> {
    return this.http.request<Role>('delete', `${this.apiUrl}/${roleId}/permissions`, { body: permissionIds });
  }

  setPermissionsForRole(roleId: string, permissionIds: string[]): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/${roleId}/permissions`, permissionIds);
  }
}
