import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Recommendation } from '../models/recommendation.model';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private base = 'http://localhost:8092/products/api/recommendations';

  constructor(private http: HttpClient) {}

  getTop(topK = 6): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(
      `${this.base}/top?topK=${topK}`
    );
  }

  getSimilar(productId: string, topK = 4): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(
      `${this.base}/similar/${productId}?topK=${topK}`
    );
  }
}