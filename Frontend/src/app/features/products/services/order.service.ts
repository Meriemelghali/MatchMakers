import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderRequest, OrderResponse } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = 'http://localhost:8092/products/api/orders';

  constructor(private http: HttpClient) {}

  createOrder(request: OrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.api, request);
  }

  getOrdersByUser(userId: string): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.api}/user/${userId}`);
  }

  getOrderById(id: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.api}/${id}`);
  }

  cancelOrder(id: string): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(`${this.api}/${id}/cancel`, {});
  }
}
