import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SponsorService } from '../services/sponsor.service';
import { Sponsor, SponsorStatus } from '../models/sponsor.model';

@Component({
  selector: 'app-sponsor-profile',
  templateUrl: './sponsor-profile.component.html',
  styleUrls: ['./sponsor-profile.component.css']
})
export class SponsorProfileComponent implements OnInit {
   SponsorStatus = SponsorStatus;

  form!:      FormGroup;
  sponsor:    Sponsor | null = null;
  loading   = false;
  submitting = false;
  uploading  = false;
  error      = '';
  success    = '';
  isEdit     = false;

  logoPreview: string | null = null;

  sports = ['Football','Tennis','Basketball','Cyclisme','Handball','Padel','Natation'];

  constructor(
    private fb:             FormBuilder,
    private sponsorService: SponsorService,
    private router:         Router
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadExisting();
  }

  buildForm() {
    this.form = this.fb.group({
      companyName:  ['', [Validators.required, Validators.minLength(2)]],
      description:  ['', [Validators.required, Validators.minLength(10)]],
      website:      [''],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['', [Validators.required,
                          Validators.pattern(/^[0-9+\s]{8,15}$/)]],
      targetSport:  [''],
      logoUrl:      ['']
    });
  }

  loadExisting() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    this.loading = true;
    this.sponsorService.getByUserId(userId).subscribe({
      next: s => {
        this.sponsor     = s;
        this.isEdit      = true;
        this.logoPreview = s.logoUrl || null;
        this.form.patchValue(s);
        this.loading = false;
      },
      error: () => { this.loading = false; } // pas encore de profil → création
    });
  }

  onLogoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    // Prévisualisation locale
    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeLogo() {
    this.logoPreview = null;
    this.form.patchValue({ logoUrl: '' });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.error      = '';
    this.success    = '';

    const userId    = localStorage.getItem('userId')    || '';
    const userEmail = localStorage.getItem('userEmail') || '';

    const payload = { ...this.form.value, userId, userEmail };

    const action$ = this.isEdit && this.sponsor
      ? this.sponsorService.update(this.sponsor.id!, payload) // Utilisation de l'opérateur d'assertion non-null
      : this.sponsorService.create(payload);

    action$.subscribe({
      next: s => {
        this.sponsor    = s;
        this.isEdit     = true;
        this.submitting = false;
        this.success    = this.isEdit
          ? 'Profil mis à jour avec succès !'
          : 'Demande de sponsoring envoyée ! En attente de validation.';
      },
      error: err => {
        this.submitting = false;
        this.error = err.error?.message || 'Erreur lors de la soumission.';
      }
    });
  }

  get statusLabel(): string {
    const map: Record<string, string> = {
      PENDING:  'En attente',
      ACTIVE:   'Actif',
      INACTIVE: 'Inactif',
      REJECTED: 'Rejeté'
    };
    return map[this.sponsor?.status || ''] || '';
  }
}