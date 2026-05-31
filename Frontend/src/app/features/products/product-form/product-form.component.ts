import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../services/product.service';
import { Product } from '../models/product.model';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css']
})
export class ProductFormComponent implements OnInit {
  form!: FormGroup;
  isEdit      = false;
  productId   = '';
  loading     = false;
  submitting  = false;
  error       = '';
  success     = false;
  imagePreview: string | null = null;
  uploading   = false;

  sports = ['Football', 'Tennis', 'Basketball', 'Cyclisme', 'Handball', 'Volleyball', 'Padel'];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      name:               ['', Validators.required],
      description:        ['', Validators.required],
      price:              [0, [Validators.required, Validators.min(0)]],
      rentalPricePerHour: [0, Validators.min(0)],
      stock:              [0, [Validators.required, Validators.min(0)]],
      imageUrl:           [''],
      sport:              ['', Validators.required],
      type:               ['SALE', Validators.required]
    });

    this.productId = this.route.snapshot.paramMap.get('id') || '';
    if (this.productId) {
      this.isEdit = true;
      this.loading = true;
      this.productService.getById(this.productId).subscribe({
        next: (p: Product) => {
          this.form.patchValue(p);
          if (p.imageUrl) this.imagePreview = p.imageUrl;
          this.loading = false;
        },
        error: () => { this.error = 'Produit introuvable'; this.loading = false; }
      });
    }
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.error = 'Veuillez sélectionner une image (JPG, PNG, WEBP)';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error = 'Image trop lourde (maximum 5MB)';
      return;
    }

    // Aperçu local
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Upload backend
    this.uploading = true;
    this.error = '';
    this.productService.uploadImage(file).subscribe({
      next: (res: { imageUrl: string }) => {
        this.form.patchValue({ imageUrl: res.imageUrl });
        this.uploading = false;
      },
      error: () => {
        this.error = 'Erreur lors de l\'upload de l\'image';
        this.uploading = false;
      }
    });
  }

  removeImage() {
    this.imagePreview = null;
    this.form.patchValue({ imageUrl: '' });
  }

  submit() {
  if (this.form.invalid) return;
  this.submitting = true;
  this.error = '';

  const request = this.isEdit
    ? this.productService.update(this.productId, this.form.value)
    : this.productService.create(this.form.value);

  request.subscribe({
    next: () => {
      this.submitting = false;
      this.success    = true;
      // ✅ Retour adapté selon la route
      const fromBackoffice = this.router.url.includes('backoffice');
      setTimeout(() => {
        if (fromBackoffice) {
          this.router.navigate(['/backoffice/products/admin']);
        } else {
          this.router.navigate(['/products']);
        }
      }, 1500);
    },
    error: (err: any) => {
      this.submitting = false;
      this.error = err.error?.message || 'Erreur lors de la sauvegarde';
    }
  });
}

cancel() {
  // ✅ Retour adapté selon la route
  const fromBackoffice = this.router.url.includes('backoffice');
  if (fromBackoffice) {
    this.router.navigate(['/backoffice/products/admin']);
  } else {
    this.router.navigate(['/products']);
  }
}
}
