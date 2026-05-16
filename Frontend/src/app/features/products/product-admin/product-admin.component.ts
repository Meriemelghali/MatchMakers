import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ProductService } from '../services/product.service';
import { Product, ProductType } from '../models/product.model';

@Component({
  selector: 'app-product-admin',
  templateUrl: './product-admin.component.html',
  styleUrls: ['./product-admin.component.css']
})
export class ProductAdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  products:  Product[] = [];
  filtered:  Product[] = [];
  loading    = false;
  error      = '';
  deleting   = false;

  sportFilter  = new FormControl('');
  typeFilter   = new FormControl('');
  searchFilter = new FormControl('');

  sports = ['Football', 'Tennis', 'Basketball', 'Cyclisme', 'Handball', 'Volleyball', 'Padel'];

  showDeleteModal  = false;
  productToDelete: string | null = null;

  // ✅ Détecter si on vient du backoffice
  get fromBackoffice(): boolean {
    return this.router.url.includes('backoffice');
  }

  get totalProducts()    { return this.products.length; }
  get totalSale()        { return this.products.filter(p => p.type === 'SALE').length; }
  get totalRental()      { return this.products.filter(p => p.type === 'RENTAL').length; }
  get totalBoth()        { return this.products.filter(p => p.type === 'BOTH').length; }
  get totalUnavailable() { return this.products.filter(p => !p.available).length; }

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit() {
    const roles   = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const role    = localStorage.getItem('userRole');
    const isAdmin = roles.includes('ADMIN') || role === 'ADMIN';
    if (!isAdmin) {
      this.router.navigate(['/products']);
      return;
    }

    this.load();
    [this.sportFilter, this.typeFilter, this.searchFilter].forEach(ctrl =>
      ctrl.valueChanges
        .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
        .subscribe(() => this.applyFilter())
    );
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  load() {
    this.loading = true;
    this.error   = '';
    this.productService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: data => { this.products = data; this.applyFilter(); this.loading = false; },
      error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
    });
  }

  applyFilter() {
    let data = [...this.products];
    const sp = this.sportFilter.value;
    const tp = this.typeFilter.value;
    const q  = this.searchFilter.value?.toLowerCase();
    if (sp) data = data.filter(p => p.sport === sp);
    if (tp) data = data.filter(p => p.type === tp);
    if (q)  data = data.filter(p => p.name.toLowerCase().includes(q));
    this.filtered = data;
  }

  resetFilters() {
    this.sportFilter.setValue('');
    this.typeFilter.setValue('');
    this.searchFilter.setValue('');
  }

  // ✅ Routes adaptées selon backoffice ou non
  addProduct() {
    if (this.fromBackoffice) {
      this.router.navigate(['/backoffice/products/add']);
    } else {
      this.router.navigate(['/products/add']);
    }
  }

  editProduct(id: string) {
    if (this.fromBackoffice) {
      this.router.navigate(['/backoffice/products/edit', id]);
    } else {
      this.router.navigate(['/products/edit', id]);
    }
  }

  back() {
    if (this.fromBackoffice) {
      this.router.navigate(['/backoffice/dashboard']);
    } else {
      this.router.navigate(['/products']);
    }
  }

  openDeleteModal(id: string) {
    this.productToDelete = id;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  confirmDelete() {
    if (!this.productToDelete) return;
    this.deleting        = true;
    const idToDelete     = this.productToDelete;
    this.showDeleteModal = false;
    this.productToDelete = null;

    this.products = this.products.filter(p => p.id !== idToDelete);
    this.applyFilter();

    this.productService.delete(idToDelete)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.deleting = false; },
        error: () => { this.deleting = false; this.error = 'Erreur suppression'; this.load(); }
      });
  }
}