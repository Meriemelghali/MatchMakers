import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface UserResponse {
  idUser: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber?: string;
  roles: string[];
  accountStatus?: string;
  createdAt?: string;
  profilePictureUrl?: string;
  sex?: string;
  classId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = `${environment.userServiceUrl}/users/users`;

  constructor(private http: HttpClient) { }

getAllUsers(): Observable<UserResponse[]> {
  return this.http.get<any>(this.apiUrl).pipe(
    map(response => {
      const list = Array.isArray(response) ? response
        : Array.isArray(response?.content) ? response.content
        : [];
      return list.map((u: any) => ({
        ...u,
        idUser: u.idUser ?? u.id
      }));
    })
  );
}

  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/${id}`);
  }

  pardonUser(userId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${userId}/pardon`, {});
  }
}
