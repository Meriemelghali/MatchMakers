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

  SponsorStatus = SponsorStatus;

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

  filters: { label: string; value: FilterValue }[] = [
    { label: 'Tous', value: 'ALL' },
    { label: 'En attente', value: SponsorStatus.PENDING },
    { label: 'Actifs', value: SponsorStatus.ACTIVE },
    { label: 'Inactifs', value: SponsorStatus.INACTIVE },
    { label: 'Rejetés', value: SponsorStatus.REJECTED }
  ];

  constructor(private sponsorService: SponsorService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.sponsorService.getAll().subscribe({
      next: (data) => {
        this.sponsors = data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Erreur de chargement';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    if (this.activeFilter === 'ALL') {
      this.filtered = [...this.sponsors];
    } else {
      this.filtered = this.sponsors.filter(
        s => s.status === this.activeFilter
      );
    }
  }

  setFilter(filter: FilterValue): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  countByStatus(status: FilterValue): number {
    if (status === 'ALL') {
      return this.sponsors.length;
    }

    return this.sponsors.filter(s => s.status === status).length;
  }

  approve(id?: string): void {
    if (!id) return;

    this.sponsorService.approve(id).subscribe({
      next: updated => this.updateLocal(updated),
      error: () => this.error = 'Erreur approbation'
    });
  }

  deactivate(id?: string): void {
    if (!id) return;

    this.sponsorService.deactivate(id).subscribe({
      next: updated => this.updateLocal(updated),
      error: () => this.error = 'Erreur désactivation'
    });
  }

  deleteSponsor(id?: string): void {
    if (!id) return;

    if (!confirm('Supprimer ce sponsor ?')) return;

    this.sponsorService.delete(id).subscribe({
      next: () => {
        this.sponsors = this.sponsors.filter(s => s.id !== id);
        this.applyFilter();
      }
    });
  }

  openRejectModal(id?: string): void {
    if (!id) return;

    this.rejectTargetId = id;
    this.rejectNote = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
  }

  confirmReject(): void {

    if (!this.rejectNote.trim()) return;

    this.rejectSubmitting = true;

    this.sponsorService
      .reject(this.rejectTargetId, this.rejectNote)
      .subscribe({
        next: updated => {
          this.updateLocal(updated);
          this.rejectSubmitting = false;
          this.showRejectModal = false;
        },
        error: () => {
          this.rejectSubmitting = false;
        }
      });
  }

  openDetail(sponsor: Sponsor): void {
    this.detailSponsor = sponsor;
    this.showDetailModal = true;
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.detailSponsor = null;
  }

  private updateLocal(updated: Sponsor): void {

    const index = this.sponsors.findIndex(
      s => s.id === updated.id
    );

    if (index !== -1) {
      this.sponsors[index] = updated;
    }

    this.applyFilter();
  }

  statusLabel(status?: SponsorStatus): string {

    switch (status) {

      case SponsorStatus.PENDING:
        return 'En attente';

      case SponsorStatus.ACTIVE:
        return 'Actif';

      case SponsorStatus.INACTIVE:
        return 'Inactif';

      case SponsorStatus.REJECTED:
        return 'Rejeté';

      default:
        return '';
    }
  }
}