import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SponsorService } from '../services/sponsor.service';
import { CampaignService } from '../services/campaign.service';
import { SponsorAIService } from '../services/sponsor-ai.service';
import { Sponsor, Campaign, CampaignTarget, CampaignPosition } from '../models/sponsor.model';

@Component({
  selector: 'app-campaign-form',
  templateUrl: './campaign-form.component.html',
  styleUrls: ['./campaign-form.component.css']
})
export class CampaignFormComponent implements OnInit {

  form!: FormGroup;
  sponsor: Sponsor | null = null;
  loading = false;
  submitting = false;
  error = '';
  success = '';
  isEdit = false;
  campaignId: string | null = null;
  bannerPreview: string | null = null;

  sports = ['Football','Tennis','Basketball','Cyclisme','Handball','Padel','Natation','Volleyball'];

  constructor(
    private fb: FormBuilder,
    private sponsorService: SponsorService,
    private campaignService: CampaignService,
    private sponsorAIService: SponsorAIService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadSponsor();

    this.campaignId = this.route.snapshot.paramMap.get('id');

    if (this.campaignId) {
      this.isEdit = true;
      this.loadCampaign(this.campaignId);
    }
  }

  // ───────────────────────── FORM
  buildForm() {
    this.form = this.fb.group({
      campaignName: ['', [Validators.required, Validators.minLength(5)]],
      targetUrl: ['', Validators.required],
      description: [''],

      target: ['GLOBAL', Validators.required],
      targetSport: [''],
      badge: [''],
      position: ['FEATURED', Validators.required],

      bannerUrl: [''],
      budget: ['', [Validators.required, Validators.min(0)]],

      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    });
  }

  // ───────────────────────── SPONSOR
  loadSponsor() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    this.loading = true;
    this.sponsorService.getByUserId(userId).subscribe({
      next: s => {
        this.sponsor = s;
        this.loading = false;
      },
      error: () => {
        this.error = 'Sponsor introuvable';
        this.loading = false;
      }
    });
  }

  // ───────────────────────── EDIT LOAD (FIX PRINCIPAL)
  loadCampaign(id: string) {
    this.campaignService.getById(id).subscribe({
      next: (c: any) => {

        console.log("BACKEND RESPONSE:", c);

        this.form.patchValue({
          campaignName: c.campaignName || '', 
          targetUrl: c.targetUrl || '', 
          description: c.description || '',

          target: c.target || 'GLOBAL',
          targetSport: c.targetSport || '', // au cas où le backend l'ajoute
          badge: c.badge || '',
          position: c.position || 'FEATURED',

          budget: c.budget || 0, 

          startDate: this.formatDate(c.startDate),
          endDate: this.formatDate(c.endDate),

          bannerUrl: c.bannerUrl || ''
        });

        this.bannerPreview = c.bannerUrl || null;
      },
      error: (err) => {
        console.error(err);
        this.error = "Erreur chargement campagne";
      }
    });
  }
  // ───────────────────────── DATE FIX
  private formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // ───────────────────────── IMAGE
  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.bannerPreview = reader.result as string;
      this.form.patchValue({ bannerUrl: this.bannerPreview });
    };
    reader.readAsDataURL(file);
  }

  removeBanner() {
    this.bannerPreview = null;
    this.form.patchValue({ bannerUrl: '' });
  }

  // ───────────────────────── AI GENERATION
  isGeneratingDesc = false;

  generateDescription() {
    const campaignName = this.form.get('campaignName')?.value;
    const targetSport = this.form.get('targetSport')?.value;
    
    if (!campaignName) {
      alert("Veuillez d'abord saisir un nom de campagne pour que l'IA puisse s'en inspirer.");
      return;
    }

    this.isGeneratingDesc = true;
    this.sponsorAIService.generateDescription(campaignName, targetSport).subscribe({
      next: (res) => {
        this.form.patchValue({ description: res.description });
        this.isGeneratingDesc = false;
      },
      error: (err) => {
        console.error("AI Gen Error", err);
        alert("L'IA n'a pas pu générer la description.");
        this.isGeneratingDesc = false;
      }
    });
  }

  // ───────────────────────── SUBMIT
  submit() {
    if (this.form.invalid || !this.sponsor) return;

    this.submitting = true;

    const v = this.form.value;

    const request: any = {
      sponsorId: this.sponsor.id!,
      campaignName: v.campaignName,
      description: v.description,
      bannerUrl: v.bannerUrl,
      target: v.target,
      targetUrl: v.targetUrl,
      targetSport: v.targetSport,
      badge: v.badge,
      position: v.position,
      budget: v.budget,
      
      startDate: v.startDate ? v.startDate + 'T00:00:00' : '',
      endDate: v.endDate ? v.endDate + 'T23:59:59' : ''
    };

    console.log('REQUEST:', request);

    const action$ = this.isEdit && this.campaignId
      ? this.campaignService.update(this.campaignId, request)
      : this.campaignService.create(request);

    action$.subscribe({
      next: () => {
        this.submitting = false;
        this.success = this.isEdit
          ? 'Campagne mise à jour'
          : 'Campagne créée';

        setTimeout(() =>
          this.router.navigate(['/sponsor/campaigns']), 1200
        );
      },
      error: (err) => {
        this.submitting = false;
        console.error(err);
        this.error = err?.error?.message || 'Erreur serveur';
      }
    });
  }

  cancel() {
    this.router.navigate(['/sponsor/campaigns']);
  }
  getDuration(): number {
  const start = this.form.get('startDate')?.value;
  const end = this.form.get('endDate')?.value;

  if (!start || !end) return 0;

  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
}