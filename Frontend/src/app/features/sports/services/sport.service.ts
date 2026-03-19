import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sport } from '../sport.model';
import { environment } from '../../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class SportService {

  private readonly API = `${environment.sportServiceUrl}/api/sports`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<Sport[]> {
    return this.http.get<Sport[]>(this.API);
  }

  getById(id: string): Observable<Sport> {
    return this.http.get<Sport>(`${this.API}/${id}`);
  }
}
