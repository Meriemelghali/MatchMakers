import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

export interface AdminOrder {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  deliveryFee: number;
  orderType: 'PURCHASE' | 'RENTAL';
  status: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
  paymentMethod: 'CASH' | 'CARD';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  startDateTime?: string;
  endDateTime?: string;
  durationHours?: number;
  deliveryName?: string;
  deliveryPhone?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  pickupLocation?: string;
  pickupNote?: string;
  pickupDateTime?: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-admin-orders',
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.css']
})
export class AdminOrdersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private api = 'http://localhost:8092/products/api';

  orders: AdminOrder[] = [];
  filtered: AdminOrder[] = [];
  loading = false;
  error = '';
  confirming: string | null = null;

  // Filtres
  statusFilter  = new FormControl('');
  methodFilter  = new FormControl('');
  searchFilter  = new FormControl('');

  // Detail modal
  selectedOrder: AdminOrder | null = null;
  showDetail = false;

  // Confirm modal
  orderToConfirm: string | null = null;
  showConfirmModal = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const roles   = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const role    = localStorage.getItem('userRole');
    const isAdmin = roles.includes('ADMIN') || role === 'ADMIN';
    if (!isAdmin) { this.router.navigate(['/products']); return; }

    this.load();

    [this.statusFilter, this.methodFilter, this.searchFilter].forEach(ctrl =>
      ctrl.valueChanges
        .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
        .subscribe(() => this.applyFilter())
    );
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  load() {
    this.loading = true;
    this.error = '';
    this.http.get<AdminOrder[]>(`${this.api}/orders`).subscribe({
      next: data => {
        // Trier : CASH+PENDING en premier
        this.orders = data.sort((a, b) => {
          const aPriority = a.paymentMethod === 'CASH' && a.status === 'PENDING' ? 0 : 1;
          const bPriority = b.paymentMethod === 'CASH' && b.status === 'PENDING' ? 0 : 1;
          return aPriority - bPriority;
        });
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
    });
  }

  applyFilter() {
    let data = [...this.orders];
    const st = this.statusFilter.value;
    const mt = this.methodFilter.value;
    const q  = this.searchFilter.value?.toLowerCase();
    if (st) data = data.filter(o => o.status === st);
    if (mt) data = data.filter(o => o.paymentMethod === mt);
    if (q)  data = data.filter(o =>
      o.productName.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      (o.deliveryName || '').toLowerCase().includes(q)
    );
    this.filtered = data;
  }

  resetFilters() {
    this.statusFilter.setValue('');
    this.methodFilter.setValue('');
    this.searchFilter.setValue('');
  }

  // ── KPIs ──
  get totalOrders()      { return this.orders.length; }
  get pendingCash()      { return this.orders.filter(o => o.paymentMethod === 'CASH' && o.status === 'PENDING').length; }
  get totalRevenue()     { return this.orders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + o.totalPrice, 0); }
  get deliveredCount()   { return this.orders.filter(o => o.status === 'DELIVERED').length; }

  // ── Confirm modal ──
  openConfirmModal(orderId: string, e: Event) {
    e.stopPropagation();
    this.orderToConfirm = orderId;
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.orderToConfirm = null;
  }

  confirmDelivery() {
    if (!this.orderToConfirm) return;
    const orderId = this.orderToConfirm;
    this.showConfirmModal = false;
    this.confirming = orderId;

    this.http.post<any>(`${this.api}/payments/confirm-delivery/${orderId}`, {}).subscribe({
      next: () => {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
          order.status = 'DELIVERED';
          order.paymentStatus = 'PAID';
        }
        this.confirming = null;
        this.orderToConfirm = null;
        this.applyFilter();
      },
      error: err => {
        this.error = 'Erreur confirmation livraison';
        this.confirming = null;
        console.error(err);
      }
    });
  }

  // ── Detail modal ──
  openDetail(order: AdminOrder) {
    this.selectedOrder = order;
    this.showDetail = true;
  }

  closeDetail() {
    this.showDetail = false;
    this.selectedOrder = null;
  }

  // ── Helpers ──
  isCashPending(o: AdminOrder): boolean {
    return o.paymentMethod === 'CASH' && o.status === 'PENDING';
  }

  back() {
    this.router.navigate(['/backoffice/dashboard']);
  }
}