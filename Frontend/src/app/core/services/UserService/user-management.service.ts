import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface User {
  idUser: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  accountStatus: string; // 'ACTIVE', 'INACTIVE', etc.
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private apiUrl = `${environment.userServiceUrl}/users/users`;

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<User[]> {
    console.log('Fetching users from:', this.apiUrl);
    return this.http.get<User[]>(this.apiUrl);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/deleteuser/${id}`);
  }

  assignRole(userId: string, roleName: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/${userId}/roles/${roleName}`, {});
  }
}
