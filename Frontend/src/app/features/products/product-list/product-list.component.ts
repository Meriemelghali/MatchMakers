import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ProductService } from '../services/product.service';
import { Product, ProductType } from '../models/product.model';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  products: Product[] = [];
  filtered: Product[] = [];
  loading = false;
  error = '';

  sportFilter  = new FormControl('');
  typeFilter   = new FormControl('');
  searchFilter = new FormControl('');

  sports = ['Football', 'Tennis', 'Basketball', 'Cyclisme', 'Handball'];
  types  = Object.values(ProductType);

  constructor(private productService: ProductService, private router: Router) {}

  ngOnInit() {
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
    this.error = '';
    this.productService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: data => { this.products = data; this.applyFilter(); this.loading = false; },
      error: () => { this.error = 'Erreur de chargement des produits'; this.loading = false; }
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

  addProduct()        { this.router.navigate(['/products/add']); }
  editProduct(id: string) { this.router.navigate(['/products/edit', id]); }

  deleteProduct(id: string, e: Event) {
    e.stopPropagation();
    if (!confirm('Confirmer la suppression ?')) return;
    this.productService.delete(id).pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.load(), error: () => alert('Erreur lors de la suppression') });
  }
}
