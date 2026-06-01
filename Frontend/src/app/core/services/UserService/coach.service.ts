import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CoachService {
  private apiUrl = `${environment.userServiceUrl}/users/api/coach`;
  
  private currentPlanSubject = new BehaviorSubject<any>(null);
  public currentPlan$ = this.currentPlanSubject.asObservable();

  constructor(private http: HttpClient) { }

  getTodayPlan(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/today-plan/${userId}`).pipe(
      tap(res => this.currentPlanSubject.next(res))
    );
  }

  askCoach(userId: string, message: string): Observable<any> {
    const payload = {
      message: message,
      context: this.currentPlanSubject.value
    };
    return this.http.post(`${this.apiUrl}/chat/${userId}`, payload).pipe(
      tap((res: any) => {
        if (res.updatedPlan) {
          this.currentPlanSubject.next(res.updatedPlan);
        }
      })
    );
  }
}
