import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SportInspiration {
  quote: string;
  from_llm: boolean;
  latency_ms: number;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private readonly API = `${environment.userServiceUrl}/users/api/ai`;

  constructor(private http: HttpClient) {}

  getSportInspiration(userId: string): Observable<SportInspiration> {
    return this.http.get<SportInspiration>(`${this.API}/sport-inspiration/${userId}`);
  }
}
