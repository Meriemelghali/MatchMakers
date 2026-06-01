import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CampaignService } from '../services/campaign.service';
import { SponsorService }  from '../services/sponsor.service';
import { Campaign, CampaignStatus, Sponsor } from '../models/sponsor.model';

@Component({
  selector: 'app-campaign-list-sponsor',
  templateUrl: './campaign-list-sponsor.component.html',
  styleUrls: ['./campaign-list-sponsor.component.css']
})
export class CampaignListSponsorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  campaigns: Campaign[] = [];
  filtered:  Campaign[] = [];
  sponsor:   Sponsor | null = null;

  loading  = false;
  error    = '';
  deleting: string | null = null;

  activeFilter: CampaignStatus | 'ALL' = 'ALL';

  CampaignStatus = CampaignStatus;

  showDeleteModal   = false;
  campaignToDelete: string | null = null;

  showDetailModal   = false;
  selectedCampaign: Campaign | null = null;

  filters: { label: string; value: CampaignStatus | 'ALL' }[] = [
    { label: 'Toutes',      value: 'ALL'                   },
    { label: 'En attente',  value: CampaignStatus.PENDING  },
    { label: 'Actives',     value: CampaignStatus.ACTIVE   },
    { label: 'En pause',    value: CampaignStatus.PAUSED   },
    { label: 'Expirées',    value: CampaignStatus.EXPIRED  },
    { label: 'Annulées',    value: CampaignStatus.CANCELLED},
  ];

  constructor(
    private campaignService: CampaignService,
    private sponsorService:  SponsorService,
    private router:          Router
  ) {}

  ngOnInit() {
    this.loadSponsorThenCampaigns();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  loadSponsorThenCampaigns() {
    const userId = localStorage.getItem('userId');
    if (!userId) { this.error = 'Utilisateur non connecté'; return; }

    this.loading = true;
    this.sponsorService.getByUserId(userId).subscribe({
      next: s => {
        this.sponsor = s;
        this.loadCampaigns(s.id!);
      },
      error: () => {
        this.error   = 'Profil sponsor introuvable. Créez votre profil sponsor d\'abord.';
        this.loading = false;
      }
    });
  }

  loadCampaigns(sponsorId: string) {
    this.campaignService.getBySponsor(sponsorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.campaigns = data.sort((a, b) =>
            new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
          );
          this.applyFilter();
          this.loading = false;
        },
        error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
      });
  }

  applyFilter() {
    this.filtered = this.activeFilter === 'ALL'
      ? [...this.campaigns]
      : this.campaigns.filter(c => c.status === this.activeFilter);
  }

  setFilter(f: CampaignStatus | 'ALL') {
    this.activeFilter = f;
    this.applyFilter();
  }

  countByStatus(status: CampaignStatus | 'ALL'): number {
    return status === 'ALL'
      ? this.campaigns.length
      : this.campaigns.filter(c => c.status === status).length;
  }

  // ── KPIs ──
  get totalViews()  { return this.campaigns.reduce((s, c) => s + (c.views  || 0), 0); }
  get totalClicks() { return this.campaigns.reduce((s, c) => s + (c.clicks || 0), 0); }
  get activeCount() { return this.campaigns.filter(c => c.status === CampaignStatus.ACTIVE).length; }
  get ctr(): string {
    if (!this.totalViews) return '0';
    return ((this.totalClicks / this.totalViews) * 100).toFixed(1);
  }

  // ── Actions ──
  newCampaign() { this.router.navigate(['/sponsor/campaigns/new']); }
  editCampaign(id: string) { this.router.navigate(['/sponsor/campaigns/edit', id]); }

  pause(id: string, e: Event) {
    e.stopPropagation();
    this.campaignService.pause(id).subscribe({
      next: updated => this.updateLocal(updated),
      error: () => this.error = 'Erreur pause'
    });
  }

  resume(id: string, e: Event) {
    e.stopPropagation();
    this.campaignService.resume(id).subscribe({
      next: updated => this.updateLocal(updated),
      error: () => this.error = 'Erreur reprise'
    });
  }

  openDeleteModal(id: string, e: Event) {
    e.stopPropagation();
    this.campaignToDelete = id;
    this.showDeleteModal  = true;
  }

  closeDeleteModal() {
    this.showDeleteModal  = false;
    this.campaignToDelete = null;
  }

  confirmDelete() {
    if (!this.campaignToDelete) return;
    const id         = this.campaignToDelete;
    this.deleting    = id;
    this.showDeleteModal  = false;
    this.campaignToDelete = null;

    this.campaigns = this.campaigns.filter(c => c.id !== id);
    this.applyFilter();

    this.campaignService.delete(id).subscribe({
      next: () => { this.deleting = null; },
      error: () => {
        this.deleting = null;
        this.error    = 'Erreur suppression';
        this.loadCampaigns(this.sponsor!.id!);
      }
    });
  }

  openDetail(c: Campaign) {
    this.selectedCampaign = c;
    this.showDetailModal  = true;
  }
  closeDetail() { this.showDetailModal = false; }

  private updateLocal(updated: Campaign) {
    const i = this.campaigns.findIndex(c => c.id === updated.id);
    if (i !== -1) this.campaigns[i] = updated;
    this.applyFilter();
  }

  statusLabel(status: CampaignStatus | undefined): string {
    const map: Record<string, string> = {
      PENDING:   'En attente',
      ACTIVE:    'Active',
      PAUSED:    'En pause',
      EXPIRED:   'Expirée',
      CANCELLED: 'Annulée',
    };
    return map[status || ''] || (status || '');
  }

  canEdit(c: Campaign):   boolean { return c.status === CampaignStatus.PENDING || c.status === CampaignStatus.PAUSED; }
  canPause(c: Campaign):  boolean { return c.status === CampaignStatus.ACTIVE; }
  canResume(c: Campaign): boolean { return c.status === CampaignStatus.PAUSED; }
  canDelete(c: Campaign): boolean { return c.status !== CampaignStatus.ACTIVE; }
}
