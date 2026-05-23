import { Component, OnInit, OnDestroy } from '@angular/core';  // ✅
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ProductService } from '../services/product.service';
import { RatingService } from '../services/rating.service';        // ✅ import ajouté
import { Product, ProductType, Rating } from '../models/product.model'; // ✅
import { RecommendationService } from '../services/recommendation.service';
import { Recommendation } from '../models/recommendation.model';
@Component({                                                       // ✅ décorateur
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  products: Product[] = [];
  filtered: Product[] = [];
  recommendations: Recommendation[] = [];
  loading  = false;
  error    = '';
  deleting = false;

  sportFilter  = new FormControl('');
  typeFilter   = new FormControl('');
  searchFilter = new FormControl('');

  sports = ['Football', 'Tennis', 'Basketball', 'Cyclisme', 'Handball'];
  types  = Object.values(ProductType);

  showDeleteModal  = false;
  productToDelete: string | null = null;

  isAdmin = false;

  constructor(
    private productService: ProductService,
    private ratingService:  RatingService,  // ✅ correctement importé
    private recommendationService: RecommendationService,  // ✅ correctement importé
    private router:         Router
  ) {}

  ngOnInit() {
    this.checkRole();
    this.load();
    this.loadRecommendations();  // ✅ Charger les recommandations
    [this.sportFilter, this.typeFilter, this.searchFilter].forEach(ctrl =>
      ctrl.valueChanges
        .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
        .subscribe(() => this.applyFilter())
    );
  }
  loadRecommendations() {
  this.recommendationService.getTop(6).subscribe({
    next: data => this.recommendations = data,
    error: () => this.recommendations = []
  });
}

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  checkRole() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { this.isAdmin = false; return; }

      const userRole = localStorage.getItem('userRole');
      if (userRole) {
        this.isAdmin = userRole === 'ADMIN' ||
                       userRole === 'ROLE_ADMIN' ||
                       userRole === 'Admin';
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      const roles: any = payload.roles || payload.role || payload.authorities || [];

      this.isAdmin = Array.isArray(roles)
        ? roles.some((r: string) => r === 'ADMIN' || r === 'ROLE_ADMIN' || r === 'Admin')
        : roles === 'ADMIN' || roles === 'ROLE_ADMIN';

    } catch (e) {
      this.isAdmin = false;
    }
  }

  load() {
    this.loading = true;
    this.error   = '';
    this.productService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Product[]) => {
        this.products = data;

        // ✅ Charger les notes pour chaque produit
        this.products.forEach((p: Product) => {
          if (p.id) {
            this.ratingService.getAverage(p.id).subscribe({
              next: (res: { average: number }) => {
                p.averageRating = res.average;  // ✅ défini dans Product
              },
              error: () => {}
            });
            this.ratingService.getByProduct(p.id).subscribe({
              next: (ratings: Rating[]) => {
                p.ratingCount = ratings.length;  // ✅ défini dans Product
              },
              error: () => {}
            });
          }
        });

        this.applyFilter();
        this.loading = false;
      },
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

  addProduct()            { this.router.navigate(['/products/add']); }
  editProduct(id: string) { this.router.navigate(['/products/edit', id]); }

  openDeleteModal(id: string, e: Event) {
    e.stopPropagation();
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
        error: (err: any) => {
          this.deleting = false;
          this.error    = 'Erreur lors de la suppression du produit';
          this.load();
          console.error('Delete error:', err);
        }
      });
  }
}