import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import { ProductService } from '../services/product.service';
import { OrderService } from '../services/order.service';
import { Product } from '../models/product.model';
import { OrderResponse } from '../models/product.model';

Chart.register(...registerables);

@Component({
  selector: 'app-product-stats',
  templateUrl: './product-stats.component.html',
  styleUrls: ['./product-stats.component.css']
})
export class ProductStatsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  products:  Product[]       = [];
  orders:    OrderResponse[] = [];
  loading    = true;
  error      = '';

  // ✅ KPIs
  totalRevenue     = 0;
  totalOrders      = 0;
  totalProducts    = 0;
  confirmedOrders  = 0;
  cancelledOrders  = 0;
  pendingOrders    = 0;

  private charts: Chart[] = [];

  constructor(
    private productService: ProductService,
    private orderService:   OrderService,
    private router:         Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.charts.forEach(c => c.destroy());
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.loading = true;
    const userId = localStorage.getItem('userId') || 'user123';

    // Charger produits
    this.productService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.totalProducts = products.length;

          // Charger commandes
          this.orderService.getOrdersByUser(userId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (orders) => {
                this.orders = orders;
                this.loading = false;
                this.calculateKPIs();
                setTimeout(() => this.buildCharts(), 100);
              },
              error: () => { this.error = 'Erreur chargement commandes'; this.loading = false; }
            });
        },
        error: () => { this.error = 'Erreur chargement produits'; this.loading = false; }
      });
  }

  calculateKPIs() {
    this.totalOrders     = this.orders.length;
    this.totalRevenue    = this.orders
      .filter(o => o.status === 'CONFIRMED' || o.status === 'DELIVERED')
      .reduce((sum, o) => sum + o.totalPrice, 0);
    this.confirmedOrders = this.orders.filter(o => o.status === 'CONFIRMED').length;
    this.cancelledOrders = this.orders.filter(o => o.status === 'CANCELLED').length;
    this.pendingOrders   = this.orders.filter(o => o.status === 'PENDING').length;
  }

  buildCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    this.buildTopProductsChart();
    this.buildRevenueBysportChart();
    this.buildOrdersByPeriodChart();
    this.buildOrderStatusChart();
    this.buildOrderTypeChart();
  }

  // Top produits vendus
  buildTopProductsChart() {
    const productSales: Record<string, number> = {};
    this.orders
      .filter(o => o.status !== 'CANCELLED')
      .forEach(o => {
        productSales[o.productName] = (productSales[o.productName] || 0) + o.quantity;
      });

    const sorted = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const canvas = document.getElementById('topProductsChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.charts.push(new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(([name]) => name),
        datasets: [{
          label: 'Quantité vendue',
          data: sorted.map(([, qty]) => qty),
          backgroundColor: [
            '#185FA5', '#1D9E75', '#BA7517', '#E24B4A', '#7F77DD'
          ],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    }));
  }

  //  Revenus par sport
  buildRevenueBysportChart() {
    const revenueBySport: Record<string, number> = {};

    this.orders
      .filter(o => o.status === 'CONFIRMED' || o.status === 'DELIVERED')
      .forEach(o => {
        const product = this.products.find(p => p.id === o.productId);
        const sport = product?.sport || 'Autre';
        revenueBySport[sport] = (revenueBySport[sport] || 0) + o.totalPrice;
      });

    const canvas = document.getElementById('revenueBySportChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.charts.push(new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(revenueBySport),
        datasets: [{
          data: Object.values(revenueBySport),
          backgroundColor: [
            '#185FA5', '#1D9E75', '#BA7517',
            '#E24B4A', '#7F77DD', '#0F6E56'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    }));
  }

  //  Commandes par période (7 derniers jours)
  buildOrdersByPeriodChart() {
    const last7Days: string[] = [];
    const counts: number[]    = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      last7Days.push(label);

      const count = this.orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate.toDateString() === d.toDateString();
      }).length;
      counts.push(count);
    }

    const canvas = document.getElementById('ordersByPeriodChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.charts.push(new Chart(canvas, {
      type: 'line',
      data: {
        labels: last7Days,
        datasets: [{
          label: 'Commandes',
          data: counts,
          borderColor: '#185FA5',
          backgroundColor: 'rgba(24,95,165,0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#185FA5',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    }));
  }

  //  Statut des commandes
  buildOrderStatusChart() {
    const canvas = document.getElementById('orderStatusChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.charts.push(new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['En attente', 'Confirmée', 'Annulée', 'Livrée'],
        datasets: [{
          data: [
            this.orders.filter(o => o.status === 'PENDING').length,
            this.orders.filter(o => o.status === 'CONFIRMED').length,
            this.orders.filter(o => o.status === 'CANCELLED').length,
            this.orders.filter(o => o.status === 'DELIVERED').length
          ],
          backgroundColor: ['#BA7517', '#1D9E75', '#E24B4A', '#185FA5']
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } }
      }
    }));
  }

  // Achat vs Location
  buildOrderTypeChart() {
    const canvas = document.getElementById('orderTypeChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.charts.push(new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Achat', 'Location'],
        datasets: [{
          label: 'Nombre',
          data: [
            this.orders.filter(o => o.orderType === 'PURCHASE').length,
            this.orders.filter(o => o.orderType === 'RENTAL').length
          ],
          backgroundColor: ['#185FA5', '#1D9E75'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    }));
  }

  back() { this.router.navigate(['/products']); }
}