import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CampaignService } from '../services/campaign.service';
import { SponsorAIService } from '../services/sponsor-ai.service';
import { Campaign, CampaignStatus, CampaignTarget } from '../models/sponsor.model';

type FilterValue = CampaignStatus | 'ALL';

@Component({
  selector: 'app-campaign-list',
  templateUrl: './campaign-list.component.html',
  styleUrls: ['./campaign-list.component.css']
})
export class CampaignListComponent implements OnInit {

  // ✅ Exposer les enums pour le template
  readonly CampaignStatus = CampaignStatus;
  readonly CampaignTarget = CampaignTarget;

  campaigns: Campaign[] = [];
  filtered: Campaign[] = [];
  loading = false;
  error = '';

  activeFilter: FilterValue = 'ALL';

  // ── Modal création/édition ──
  showFormModal = false;
  editTarget: Campaign | null = null;
  formSubmitting = false;
  formError = '';
  form!: FormGroup;

  // ── Modal rejet ──
  showRejectModal = false;
  rejectTargetId = '';
  rejectNote = '';
  rejectSubmitting = false;

  // ── Modal détail ──
  showDetailModal = false;
  detailCampaign: Campaign | null = null;

  // ── Modal suppression ──
  showDeleteModal = false;
  deleteTargetId = '';
  deleting = false;

  // ── Modal facture ──
  showInvoiceModal = false;
  invoiceCampaign: Campaign | null = null;
  invoiceNumber = '';
  today = new Date();

  filters: { label: string; value: FilterValue }[] = [
    { label: 'Toutes', value: 'ALL' },
    { label: 'En attente', value: CampaignStatus.PENDING }, // ✅ Utiliser Enum
    { label: 'Actives', value: CampaignStatus.ACTIVE },
    { label: 'En pause', value: CampaignStatus.PAUSED },
    { label: 'Rejetées', value: CampaignStatus.CANCELLED },
    { label: 'Expirées', value: CampaignStatus.EXPIRED }
  ];

  targets: { label: string; value: CampaignTarget }[] = [
    { label: '🌍 Global', value: CampaignTarget.GLOBAL }, // ✅ Utiliser Enum
    { label: '📦 Produit', value: CampaignTarget.PRODUCT },
    { label: '📅 Événement', value: CampaignTarget.EVENT }
  ];

  constructor(
    private campaignService: CampaignService,
    private sponsorAIService: SponsorAIService,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.buildForm();
    this.load();
  }

  buildForm() {
    this.form = this.fb.group({
      sponsorId: ['', Validators.required],
      campaignName: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      bannerUrl: [''],
      target: ['GLOBAL', Validators.required],
      targetId: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  load() {
    this.loading = true;
    this.error = '';
    this.campaignService.getAll().subscribe({
      next: data => {
        this.campaigns = data;
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

  setFilter(f: FilterValue) {
    this.activeFilter = f;
    this.applyFilter();
  }

  countByStatus(status: FilterValue): number {
    return status === 'ALL'
      ? this.campaigns.length
      : this.campaigns.filter(c => c.status === status).length;
  }

  get totalBudget(): number {
    return this.campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  }

  facturer(c: Campaign) {
    this.invoiceCampaign = c;
    this.invoiceNumber = 'INV-' + Date.now().toString().slice(-8);
    this.showInvoiceModal = true;
  }

  closeInvoiceModal() { this.showInvoiceModal = false; }

  printInvoice() {
    const el = document.getElementById('invoice-printable');
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Facture ${this.invoiceNumber}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #111; }
        .inv-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
        .inv-title  { font-size:28px; font-weight:800; color:#E8500A; }
        .inv-num    { font-size:13px; color:#888; margin-top:4px; }
        .inv-to     { margin-bottom:24px; }
        .inv-to strong { display:block; margin-bottom:4px; }
        table       { width:100%; border-collapse:collapse; margin-top:16px; }
        th          { background:#f5f5f5; padding:10px 14px; text-align:left; font-size:12px; text-transform:uppercase; color:#888; }
        td          { padding:12px 14px; border-bottom:1px solid #f0f0f0; }
        .total-row  { font-weight:700; font-size:16px; color:#E8500A; }
        .footer     { margin-top:48px; font-size:12px; color:#aaa; text-align:center; }
      </style></head><body>
      ${el.innerHTML}
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  // ── CRUD ──
  openCreate() {
    this.editTarget = null;
    this.formError = '';
    this.form.reset({ target: 'GLOBAL' });
    this.showFormModal = true;
  }

  openEdit(c: Campaign) {
    this.editTarget = c;
    this.formError = '';
    this.form.patchValue({
      sponsorId: c.sponsorId,
      campaignName: c.campaignName,
      description: c.description || '',
      bannerUrl: c.bannerUrl || '',
      target: c.target,
      targetId: c.targetId || '',
      startDate: c.startDate || '',
      endDate: c.endDate || ''
    });
    this.showFormModal = true;
  }

  closeFormModal() { this.showFormModal = false; }

  submitForm() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.formSubmitting = true;
    this.formError = '';

    const payload = this.form.value;
    const action$ = this.editTarget?.id
      ? this.campaignService.update(this.editTarget.id, payload)
      : this.campaignService.create(payload);

    action$.subscribe({
      next: saved => {
        if (this.editTarget?.id) {
          this.updateLocal(saved);
        } else {
          this.campaigns.unshift(saved);
          this.applyFilter();
        }
        this.formSubmitting = false;
        this.showFormModal = false;
      },
      error: err => {
        this.formSubmitting = false;
        this.formError = err.error?.message || 'Erreur lors de la sauvegarde.';
      }
    });
  }

  // ── Actions statut ──
  approve(id: string | undefined) {
    if (!id) return;
    this.campaignService.approve(id).subscribe({
      next: updated => this.updateLocal(updated),
      error: () => this.error = 'Erreur approbation'
    });
  }

  openRejectModal(id: string) {
    this.rejectTargetId = id;
    this.rejectNote = '';
    this.showRejectModal = true;
  }
  closeRejectModal() { this.showRejectModal = false; }

  confirmReject() {
    if (!this.rejectNote.trim()) return;
    this.rejectSubmitting = true;
    this.campaignService.reject(this.rejectTargetId, this.rejectNote).subscribe({
      next: updated => {
        this.updateLocal(updated);
        this.rejectSubmitting = false;
        this.showRejectModal = false;
      },
      error: () => { this.rejectSubmitting = false; }
    });
  }

  pause(id: string | undefined) {
    if (!id) return;
    this.campaignService.pause(id).subscribe({
      next: updated => this.updateLocal(updated)
    });
  }

  resume(id: string | undefined) {
    if (!id) return;
    this.campaignService.resume(id).subscribe({
      next: updated => this.updateLocal(updated)
    });
  }

  // ── Suppression ──
  openDeleteModal(id: string) {
    this.deleteTargetId = id;
    this.showDeleteModal = true;
  }
  closeDeleteModal() { this.showDeleteModal = false; }

  confirmDelete() {
    this.deleting = true;
    this.campaignService.delete(this.deleteTargetId).subscribe({
      next: () => {
        this.campaigns = this.campaigns.filter(c => c.id !== this.deleteTargetId);
        this.applyFilter();
        this.deleting = false;
        this.showDeleteModal = false;
      },
      error: () => { this.deleting = false; }
    });
  }

  // ── Détail ──
  openDetail(c: Campaign) { this.detailCampaign = c; this.showDetailModal = true; }
  closeDetail() { this.showDetailModal = false; }

  // ── Helpers ──
  private updateLocal(updated: Campaign) {
    const i = this.campaigns.findIndex(c => c.id === updated.id);
    if (i !== -1) this.campaigns[i] = updated;
    this.applyFilter();
  }

  statusLabel(status: CampaignStatus | undefined): string {
    const map: Record<string, string> = {
      PENDING: 'En attente',
      ACTIVE: 'Active',
      PAUSED: 'En pause',
      REJECTED: 'Rejetée',
      EXPIRED: 'Expirée'
    };
    return map[status || ''] || status || '';
  }

  targetLabel(target: CampaignTarget | undefined): string {
    const map: Record<string, string> = {
      GLOBAL: '🌍 Global',
      PRODUCT: '📦 Produit',
      EVENT: '📅 Événement'
    };
    return map[target || ''] || target || '';
  }

  ctr(c: Campaign): string {
    if (!c.views || c.views === 0) return '0%';
    return (((c.clicks || 0) / c.views) * 100).toFixed(1) + '%'; // ✅ Protection null
  }

  // ── AI Analytics ──
  isAnalyzing = false;
  aiAnalysisResult: string | null = null;
  showAnalysisModal = false;

  analyzeCampaigns() {
    if (this.campaigns.length === 0) {
      alert("Aucune campagne à analyser.");
      return;
    }

    this.isAnalyzing = true;
    this.sponsorAIService.analyzeCampaigns(this.campaigns).subscribe({
      next: (res) => {
        this.aiAnalysisResult = res.analysis;
        this.isAnalyzing = false;
        this.showAnalysisModal = true;
      },
      error: (err) => {
        console.error("AI Analysis Error", err);
        alert("L'IA n'a pas pu analyser les campagnes.");
        this.isAnalyzing = false;
      }
    });
  }

  closeAnalysisModal() {
    this.showAnalysisModal = false;
  }
}