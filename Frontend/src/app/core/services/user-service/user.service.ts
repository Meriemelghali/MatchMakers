import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';

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

  private apiUrl = 'http://localhost:8081/users/users';

  constructor(private http: HttpClient) { }

  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      // tap(res => console.log('UserService: Raw API Response:', res)),
      map(response => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.content)) return response.content;
        return [];
      })
    );
  }

  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/${id}`);
  }
}
