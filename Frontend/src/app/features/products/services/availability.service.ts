import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AvailabilityResponse {
  available:      boolean;
  stockTotal:     number;
  stockReserved:  number;
  stockAvailable: number;
  message:        string;
  startDateTime:  string;
  endDateTime:    string;
}

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private api = 'http://localhost:8092/products/api/availability';

  constructor(private http: HttpClient) {}

  checkRental(
    productId:     string,
    startDateTime: string,
    endDateTime:   string,
    quantity:      number = 1
  ): Observable<AvailabilityResponse> {
    const params = new HttpParams()
      .set('startDateTime', startDateTime + ':00')
      .set('endDateTime',   endDateTime   + ':00')
      .set('quantity',      quantity.toString());

    return this.http.get<AvailabilityResponse>(
      `${this.api}/rental/${productId}`, { params }
    );
  }
}