import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CoachService {
  private apiUrl = `${environment.userServiceUrl}/users/api/coach`;

  constructor(private http: HttpClient) { }

  getTodayPlan(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/today-plan/${userId}`);
  }

  askCoach(userId: string, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/${userId}`, { message });
  }
}
