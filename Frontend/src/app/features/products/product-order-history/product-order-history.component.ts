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
  showCancelModal = false;
  orderToCancel: string | null = null;
  cancelling = false;

  constructor(private orderService: OrderService, private router: Router) {}

  ngOnInit() {
    const userId = localStorage.getItem('userId') || 'user123';
    this.loading = true;
    this.orderService.getOrdersByUser(userId).subscribe({
      next: data => { this.orders = data; this.loading = false; },
      error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
    });
  }

  openCancelModal(id: string, e: Event) {
    e.stopPropagation();
    this.orderToCancel = id;
    this.showCancelModal = true;
  }

  closeCancelModal() {
    this.showCancelModal = false;
    this.orderToCancel = null;
  }

  confirmCancel() {
    if (!this.orderToCancel) return;
    
    // Fermer immédiatement le modal et désactiver le bouton
    this.cancelling = true;
    const idToCancel = this.orderToCancel;
    this.showCancelModal = false;
    this.orderToCancel = null;
    
    // Mettre à jour le statut localement
    const order = this.orders.find(o => o.id === idToCancel);
    if (order) {
      order.status = OrderStatus.CANCELLED;
    }
    
    // Appeler le service pour annuler au backend
    this.orderService.cancelOrder(idToCancel).subscribe({
      next: () => {
        this.cancelling = false;
      },
      error: () => {
        this.cancelling = false;
        this.error = 'Erreur lors de l\'annulation de la commande';
        // Restaurer le statut en cas d'erreur
        this.ngOnInit();
      }
    });
  }

  back() { this.router.navigate(['/products']); }
}
