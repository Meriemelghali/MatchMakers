import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Rating, RatingRequest } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class RatingService {
  private api = 'http://localhost:8092/products/api/ratings';

  constructor(private http: HttpClient) {}

  addOrUpdate(req: RatingRequest): Observable<Rating> {
    return this.http.post<Rating>(this.api, req);
  }

  getByProduct(productId: string): Observable<Rating[]> {
    return this.http.get<Rating[]>(`${this.api}/product/${productId}`);
  }

  getAverage(productId: string): Observable<{ average: number }> {
    return this.http.get<{ average: number }>(
      `${this.api}/product/${productId}/average`
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}