import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../services/order.service';
import { OrderResponse, OrderStatus } from '../models/product.model';

@Component({
  selector: 'app-product-order-history',
  templateUrl: './product-order-history.component.html',
  styleUrls: ['./product-order-history.component.css']
})
export class ProductOrderHistoryComponent implements OnInit {
  orders: OrderResponse[] = [];
  loading = false;
  error = '';
  OrderStatus = OrderStatus;

  constructor(private orderService: OrderService, private router: Router) {}

  ngOnInit() {
    const userId = localStorage.getItem('userId') || 'user123';
    this.loading = true;
    this.orderService.getOrdersByUser(userId).subscribe({
      next: data => { this.orders = data; this.loading = false; },
      error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
    });
  }

  cancel(id: string) {
    if (!confirm('Annuler cette commande ?')) return;
    this.orderService.cancelOrder(id).subscribe({
      next: () => this.ngOnInit(),
      error: () => alert('Erreur lors de l\'annulation')
    });
  }

  back() { this.router.navigate(['/products']); }
}
