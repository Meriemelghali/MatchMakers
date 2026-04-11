import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../services/payment.service';
import { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';

@Component({
  selector: 'app-product-payment',
  templateUrl: './product-payment.component.html',
  styleUrls: ['./product-payment.component.css']
})
export class ProductPaymentComponent implements OnInit {
  orderId       = '';
  orderTotal    = 0;
  paymentMethod: 'CASH' | 'CARD' = 'CASH';
  processing    = false;
  success       = false;
  error         = '';

  // Stripe
  stripe!:   Stripe;
  elements!: StripeElements;
  card!:     StripeCardElement;
  cardReady  = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService
  ) {}

  async ngOnInit() {
    this.orderId    = this.route.snapshot.paramMap.get('orderId') || '';
    this.orderTotal = +this.route.snapshot.queryParamMap.get('total')! || 0;
  }

  // ✅ Initialiser Stripe quand on choisit CARD
  async selectCard() {
    this.paymentMethod = 'CARD';
    if (this.cardReady) return;

    const stripeInstance = await this.paymentService.getStripe();
    if (!stripeInstance) return;

    this.stripe   = stripeInstance;
    this.elements = this.stripe.elements();
    this.card     = this.elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#32325d',
          '::placeholder': { color: '#aab7c4' }
        }
      }
    });

    setTimeout(() => {
      this.card.mount('#card-element');
      this.cardReady = true;
    }, 100);
  }

  selectCash() {
    this.paymentMethod = 'CASH';
  }

  async pay() {
    this.processing = true;
    this.error = '';

    if (this.paymentMethod === 'CASH') {
      this.paymentService.cashPayment(this.orderId).subscribe({
        next: () => {
          this.processing = false;
          this.success = true;
          setTimeout(() => this.router.navigate(['/products/orders']), 2000);
        },
        error: (err: any) => {
          this.processing = false;
          this.error = err.error?.message || 'Erreur paiement cash';
        }
      });
    } else {
      // Paiement carte Stripe
      this.paymentService.createPaymentIntent(this.orderId).subscribe({
        next: async (res) => {
          const result = await this.stripe.confirmCardPayment(res.clientSecret, {
            payment_method: { card: this.card }
          });

          if (result.error) {
            this.processing = false;
            this.error = result.error.message || 'Paiement refusé';
          } else if (result.paymentIntent?.status === 'succeeded') {
            this.paymentService.confirmPayment(
              this.orderId,
              result.paymentIntent.id
            ).subscribe({
              next: () => {
                this.processing = false;
                this.success = true;
                setTimeout(() => this.router.navigate(['/products/orders']), 2000);
              }
            });
          }
        },
        error: (err: any) => {
          this.processing = false;
          this.error = err.error?.message || 'Erreur création paiement';
        }
      });
    }
  }

  cancel() { this.router.navigate(['/products/orders']); }
}