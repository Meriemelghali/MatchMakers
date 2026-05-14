import { Component, OnInit } from '@angular/core';
import { SponsorService } from '../../services/sponsor.service';
import { Sponsor, SponsorStatus } from '../../models/sponsor.model';

type FilterValue = SponsorStatus | 'ALL';

@Component({
  selector: 'app-sponsor-admin',
  templateUrl: './sponsor-admin.component.html',
  styleUrls: ['./sponsor-admin.component.css']
})
export class SponsorAdminComponent implements OnInit {

  // ✅ Exposer l'enum au template
  readonly SponsorStatus = SponsorStatus;

  sponsors: Sponsor[] = [];
  filtered: Sponsor[] = [];
  loading = false;
  error = '';

  activeFilter: FilterValue = 'ALL';

  showRejectModal = false;
  rejectTargetId = '';
  rejectNote = '';
  rejectSubmitting = false;

  showDetailModal = false;
  detailSponsor: Sponsor | null = null;

  // ── Modal suppression ──
  showDeleteModal = false;
  deleteTargetId = '';
  deleting = false;

  filters: { label: string; value: FilterValue }[] = [
    { label: 'Tous', value: 'ALL' },
    { label: 'En attente', value: SponsorStatus.PENDING },
    { label: 'Actifs', value: SponsorStatus.ACTIVE },
    { label: 'Inactifs', value: SponsorStatus.INACTIVE },
    { label: 'Rejetés', value: SponsorStatus.REJECTED }
  ];

  constructor(private sponsorService: SponsorService) { }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    this.sponsorService.getAll().subscribe({
      next: data => {
        // ✅ Normaliser le statut (string JSON → enum)
        this.sponsors = data.map(s => ({
          ...s,
          status: (s.status as unknown as string) as SponsorStatus
        }));
        this.applyFilter();
        this.loading = false;
      },
      error: err => {
        console.error('Erreur chargement sponsors:', err);
        this.error = 'Erreur de chargement des sponsors.';
        this.loading = false;
      }
    });
  }

  applyFilter() {
    this.filtered = this.activeFilter === 'ALL'
      ? [...this.sponsors]
      : this.sponsors.filter(s => s.status === this.activeFilter);
  }

  setFilter(f: FilterValue) {
    this.activeFilter = f;
    this.applyFilter();
  }

  countByStatus(status: FilterValue): number {
    return status === 'ALL'
      ? this.sponsors.length
      : this.sponsors.filter(s => s.status === status).length;
  }

  approve(id: string | undefined) {
    if (!id) return;
    this.sponsorService.approve(id).subscribe({
      next: u => this.updateLocal(u),
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
    this.sponsorService.reject(this.rejectTargetId, this.rejectNote).subscribe({
      next: u => {
        this.updateLocal(u);
        this.rejectSubmitting = false;
        this.showRejectModal = false;
      },
      error: () => { this.rejectSubmitting = false; }
    });
  }

  deactivate(id: string) {
    this.sponsorService.deactivate(id).subscribe({
      next: u => this.updateLocal(u),
      error: () => this.error = 'Erreur désactivation'
    });
  }

  openDeleteModal(id: string) {
    this.deleteTargetId = id;
    this.showDeleteModal = true;
  }
  closeDeleteModal() { this.showDeleteModal = false; }

  confirmDelete() {
    this.deleting = true;
    this.sponsorService.delete(this.deleteTargetId).subscribe({
      next: () => {
        this.sponsors = this.sponsors.filter(s => s.id !== this.deleteTargetId);
        this.applyFilter();
        this.deleting = false;
        this.showDeleteModal = false;
      },
      error: () => { this.deleting = false; }
    });
  }

  openDetail(s: Sponsor) { this.detailSponsor = s; this.showDetailModal = true; }
  closeDetail() { this.showDetailModal = false; }

  private updateLocal(updated: Sponsor) {
    const norm = {
      ...updated,
      status: (updated.status as unknown as string) as SponsorStatus
    };
    const i = this.sponsors.findIndex(s => s.id === norm.id);
    if (i !== -1) this.sponsors[i] = norm;
    this.applyFilter();
  }

  statusLabel(status: SponsorStatus | undefined): string {
    if (!status) return '—';
    const map: Record<SponsorStatus, string> = {
      [SponsorStatus.PENDING]: 'En attente',
      [SponsorStatus.ACTIVE]: 'Actif',
      [SponsorStatus.INACTIVE]: 'Inactif',
      [SponsorStatus.REJECTED]: 'Rejeté'
    };
    return map[status] ?? status;
  }
}