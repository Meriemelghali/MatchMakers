import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { loadStripe, Stripe } from '@stripe/stripe-js';

export interface PaymentResponse {
  orderId:      string;
  status:       string;
  clientSecret: string;
  amount:       number;
  currency:     string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private api = 'http://localhost:8092/products/api/payments';
  private stripePromise = loadStripe('pk_test_51TKntlP3ltRFsmxAdyuwlHBhUon5ALHCSPMfhQKNz3O2XaHK8DmagG0kJEpgJt4QP6bIp9QQYQHVk8mnVUMY1d7D0013o2W6Jd'); 

  constructor(private http: HttpClient) {}

  createPaymentIntent(orderId: string): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.api}/create-intent/${orderId}`, {});
  }

  confirmPayment(orderId: string, paymentIntentId: string): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.api}/confirm`, {
      orderId, paymentIntentId
    });
  }

  cashPayment(orderId: string): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.api}/cash/${orderId}`, {});
  }

  getStripe(): Promise<Stripe | null> {
    return this.stripePromise;
  }

  confirmDelivery(orderId: string): Observable<PaymentResponse> {
  return this.http.post<PaymentResponse>(
    `${this.api}/confirm-delivery/${orderId}`, {}
  );
}
}