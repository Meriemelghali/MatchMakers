import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../services/product.service';
import { RatingService }  from '../services/rating.service';
import { Product, Rating } from '../models/product.model';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls:  ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit {
  product!:  Product;
  ratings:   Rating[] = [];
  average    = 0;
  loading    = false;
  error      = '';

  // Avis
  ratingForm!:   FormGroup;
  selectedStars  = 0;
  submittingRating = false;
  ratingSuccess  = false;
  ratingError    = '';
  showAllReviews = false;

  get visibleRatings() {
    return this.showAllReviews ? this.ratings : this.ratings.slice(0, 3);
  }

  get userId()   { return localStorage.getItem('userId')    || ''; }
  get userName() {
    const f = localStorage.getItem('firstName') || '';
    const l = localStorage.getItem('lastName')  || '';
    return `${f} ${l}`.trim() || 'Anonyme';
  }

  constructor(
    private route:         ActivatedRoute,
    private router:        Router,
    private fb:            FormBuilder,
    private productService: ProductService,
    private ratingService:  RatingService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;

    this.productService.getById(id).subscribe({
      next: (p) => {
        this.product = p;
        this.loading = false;
        this.loadRatings(id);
      },
      error: () => { this.error = 'Produit introuvable'; this.loading = false; }
    });

    this.ratingForm = this.fb.group({
      comment: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  loadRatings(productId: string) {
    this.ratingService.getByProduct(productId).subscribe({
      next: (r) => { this.ratings = r; this.calcAverage(); }
    });
  }

  calcAverage() {
    if (!this.ratings.length) { this.average = 0; return; }
    this.average = this.ratings.reduce((s, r) => s + r.stars, 0) / this.ratings.length;
  }

  onStarSelected(stars: number) { this.selectedStars = stars; }

  submitRating() {
    if (!this.selectedStars) {
      this.ratingError = 'Veuillez sélectionner une note.';
      return;
    }
    if (this.ratingForm.invalid) return;

    this.submittingRating = true;
    this.ratingError      = '';

    this.ratingService.addOrUpdate({
      productId: this.product.id!,
      userId:    this.userId,
      userName:  this.userName,
      stars:     this.selectedStars,
      comment:   this.ratingForm.value.comment
    }).subscribe({
      next: () => {
        this.submittingRating = false;
        this.ratingSuccess    = true;
        this.ratingForm.reset();
        this.selectedStars    = 0;
        this.loadRatings(this.product.id!);
        setTimeout(() => this.ratingSuccess = false, 3000);
      },
      error: () => {
        this.submittingRating = false;
        this.ratingError = 'Erreur lors de l\'envoi de l\'avis.';
      }
    });
  }

  order() { this.router.navigate(['/products/order', this.product.id]); }
  back()  { this.router.navigate(['/products']); }

  getStarPercent(star: number): number {
    if (!this.ratings.length) return 0;
    return Math.round(
      (this.ratings.filter(r => r.stars === star).length / this.ratings.length) * 100
    );
  }
}