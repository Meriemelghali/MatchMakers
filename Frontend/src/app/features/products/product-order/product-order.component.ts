import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup,
         ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../services/product.service';
import { OrderService } from '../services/order.service';
import { Product, OrderType } from '../models/product.model';
import { AvailabilityService, AvailabilityResponse } from '../services/availability.service';

export const dateTimeRangeValidator: ValidatorFn =
  (group: AbstractControl): ValidationErrors | null => {
    const start = group.get('startDateTime')?.value;
    const end   = group.get('endDateTime')?.value;
    if (!start || !end) return null;
    return new Date(start) < new Date(end) ? null : { dateTimeRangeInvalid: true };
  };

@Component({
  selector: 'app-product-order',
  templateUrl: './product-order.component.html',
  styleUrls: ['./product-order.component.css']
})
export class ProductOrderComponent implements OnInit {
  product!:      Product;
  form!:         FormGroup;
  deliveryForm!: FormGroup;
  pickupForm!:   FormGroup;
  loading      = false;
  submitting   = false;
  error        = '';
  success      = false;
  showDelivery = false;
  showPickup   = false;        
  OrderType    = OrderType;
  readonly DELIVERY_FEE = 7.0;
  availability:        AvailabilityResponse | null = null;
  checkingAvailability = false;

  get minDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  get minEndDateTime(): string {
    const start = this.form?.get('startDateTime')?.value;
    if (!start) return this.minDateTime;
    const d = new Date(start);
    d.setHours(d.getHours() + 1);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private orderService: OrderService,
       private availabilityService: AvailabilityService 
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;
    this.productService.getById(id).subscribe({
      next: (p: Product) => {
        this.product = p;
        this.loading = false;
        this.buildForm();
      },
      error: () => { this.error = 'Produit introuvable'; this.loading = false; }
    });
  }

  buildForm() {
    const defaultType = this.product.type === 'RENTAL'
      ? OrderType.RENTAL : OrderType.PURCHASE;

    this.form = this.fb.group({
      orderType:     [defaultType, Validators.required],
      quantity:      [1, [Validators.required, Validators.min(1)]],
      startDateTime: [''],
      endDateTime:   ['']
    }, { validators: dateTimeRangeValidator });

    this.deliveryForm = this.fb.group({
      deliveryName:    ['', Validators.required],
      deliveryPhone:   ['', [Validators.required,
                             Validators.pattern(/^[0-9+\s]{8,15}$/)]],
      deliveryAddress: ['', Validators.required],
      deliveryCity:    ['', Validators.required]
    });

    this.pickupForm = this.fb.group({
      pickupLocation: ['', Validators.required],
      pickupNote:     ['']
    });

    this.form.get('orderType')?.valueChanges.subscribe(val => {
      if (val === OrderType.RENTAL) {
        this.form.get('startDateTime')?.setValidators([Validators.required]);
        this.form.get('endDateTime')?.setValidators([Validators.required]);
      } else {
        this.form.get('startDateTime')?.clearValidators();
        this.form.get('endDateTime')?.clearValidators();
      }
      this.form.get('startDateTime')?.updateValueAndValidity();
      this.form.get('endDateTime')?.updateValueAndValidity();
    });

    this.form.get('startDateTime')?.valueChanges.subscribe(() => {
      this.availability = null;
      this.checkAvailability();
    });
    this.form.get('endDateTime')?.valueChanges.subscribe(() => {
      this.availability = null;
      this.checkAvailability();
    });
    this.form.get('quantity')?.valueChanges.subscribe(() => {
      this.availability = null;
      this.checkAvailability();
    });
  }

  // ✅ Vérifier la disponibilité
  checkAvailability() {
    const start = this.form.get('startDateTime')?.value;
    const end   = this.form.get('endDateTime')?.value;
    const qty   = this.form.get('quantity')?.value;

    if (!start || !end || !this.isRental || this.dateTimeRangeError) return;

    this.checkingAvailability = true;
    this.availabilityService.checkRental(
      this.product.id!, start, end, qty
    ).subscribe({
      next: (res) => {
        this.availability        = res;
        this.checkingAvailability = false;
      },
      error: () => { this.checkingAvailability = false; }
    });
  }

  // ✅ Bloquer si indisponible
get canSubmit(): boolean {
  if (this.submitting) return false;
  if (this.form.invalid) return false;
  if (this.dateTimeRangeError) return false;

  if (this.isRental) {
    // ✅ Bloquer si vérification en cours OU indisponible OU pas encore vérifié
    if (this.checkingAvailability) return false;
    if (!this.availability) return false;          // pas encore vérifié
    if (!this.availability.available) return false; // indisponible
  }

  return true;
}

  get isRental() {
    return this.form?.get('orderType')?.value === OrderType.RENTAL;
  }

  get dateTimeRangeError(): boolean {
    return this.form?.hasError('dateTimeRangeInvalid') &&
           !!this.form.get('startDateTime')?.value &&
           !!this.form.get('endDateTime')?.value;
  }

  get durationHours(): number {
    const start = this.form?.get('startDateTime')?.value;
    const end   = this.form?.get('endDateTime')?.value;
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.floor(diff / 3600000));
  }

  get estimatedTotal(): number {
    if (!this.product || !this.form) return 0;
    const qty = this.form.get('quantity')?.value || 1;
    if (this.isRental) {
      return this.product.rentalPricePerHour * this.durationHours * qty;
    }
    return (this.product.price * qty) + this.DELIVERY_FEE;
  }

  // ── Popup livraison (ACHAT) ──────────────────────────────
  openDeliveryPopup() {
    if (this.form.invalid) return;
    this.showDelivery = true;
  }

  closeDeliveryPopup() { this.showDelivery = false; }

  confirmOrder() {
    if (this.deliveryForm.invalid) return;
    this.submitting   = true;
    this.error        = '';
    this.showDelivery = false;

    const userId = localStorage.getItem('userId') || 'user123';

    const request = {
      userId,
      productId:       this.product.id!,
      quantity:        this.form.value.quantity,
      orderType:       this.form.value.orderType,
      deliveryName:    this.deliveryForm.value.deliveryName,
      deliveryPhone:   this.deliveryForm.value.deliveryPhone,
      deliveryAddress: this.deliveryForm.value.deliveryAddress,
      deliveryCity:    this.deliveryForm.value.deliveryCity
    };

    this.orderService.createOrder(request).subscribe({
      next: (order: any) => {
        this.submitting = false;
        this.success    = true;
        setTimeout(() => this.router.navigate(
          ['/products/payment', order.id],
          { queryParams: { total: order.totalPrice } }
        ), 500);
      },
      error: (err: any) => {
        this.submitting = false;
        this.error = err.error?.message || 'Erreur lors de la commande';
      }
    });
  }

  // ── Popup retrait (LOCATION) ─────────────────────────────
  openPickupPopup() {
  if (!this.canSubmit) return;   // ← bloque si indispo aussi
  this.showPickup = true;
}

  closePickupPopup() { this.showPickup = false; }

  confirmPickup() {
    if (this.pickupForm.invalid) return;
    this.submitting  = true;
    this.error       = '';
    this.showPickup  = false;

    const userId = localStorage.getItem('userId') || 'user123';

    const request = {
      userId,
      productId:      this.product.id!,
      quantity:       this.form.value.quantity,
      orderType:      this.form.value.orderType,
      startDateTime:  this.form.value.startDateTime + ':00',
      endDateTime:    this.form.value.endDateTime   + ':00',
      pickupLocation: this.pickupForm.value.pickupLocation,
      pickupNote:     this.pickupForm.value.pickupNote,
      pickupDateTime: this.form.value.startDateTime + ':00'
    };

    this.orderService.createOrder(request).subscribe({
      next: (order: any) => {
        this.submitting = false;
        this.success    = true;
        setTimeout(() => this.router.navigate(
          ['/products/payment', order.id],
          { queryParams: { total: order.totalPrice } }
        ), 500);
      },
      error: (err: any) => {
        this.submitting = false;
        this.error = err.error?.message || 'Erreur lors de la commande';
      }
    });
  }

  // ── Submit principal ─────────────────────────────────────
  submit() {
    if (this.form.invalid) return;
    if (!this.isRental) {
      this.openDeliveryPopup();   // Achat → popup livraison
    } else {
      this.openPickupPopup();     // Location → popup retrait
    }
  }

  cancel() { this.router.navigate(['/products']); }
}