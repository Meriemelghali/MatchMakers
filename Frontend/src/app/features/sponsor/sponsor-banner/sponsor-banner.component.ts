import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CampaignService } from '../services/campaign.service';
import { Campaign } from '../models/sponsor.model';

@Component({
  selector: 'app-sponsor-banner',
  templateUrl: './sponsor-banner.component.html',
  styleUrls:  ['./sponsor-banner.component.css']
})
export class SponsorBannerComponent implements OnInit, OnDestroy {

  @Input() productId?: string; // si fourni → bannière ciblée produit

  campaigns:   Campaign[] = [];
  currentIndex = 0;
  loading      = false;
  private timer: any;

  constructor(private campaignService: CampaignService) {}

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  load() {
    this.loading = true;

    const request$ = this.productId
      ? this.campaignService.getActiveForProduct(this.productId)
      : this.campaignService.getActiveGlobal();

    request$.subscribe({
      next: (data) => {
        // ✅ Garder seulement les campagnes avec bannerUrl
        this.campaigns = data.filter(c => c.bannerUrl);
        this.loading   = false;
        if (this.campaigns.length > 1) this.startRotation();
      },
      error: () => { this.loading = false; }
    });
  }

  // ✅ Rotation automatique toutes les 5 secondes
  startRotation() {
    this.timer = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.campaigns.length;
    }, 5000);
  }

  get current(): Campaign | null {
    return this.campaigns.length ? this.campaigns[this.currentIndex] : null;
  }

  goTo(index: number) {
    this.currentIndex = index;
    // Reset timer
    if (this.timer) clearInterval(this.timer);
    if (this.campaigns.length > 1) this.startRotation();
  }

  // ✅ Tracker le clic
  onBannerClick() {
    if (!this.current?.id) return;
    this.campaignService.trackClick(this.current.id).subscribe();
    if (this.current.targetId && this.current.target === 'PRODUCT') {
      window.open(`/products/detail/${this.current.targetId}`, '_blank');
    } else if (this.current.targetId && this.current.target === 'EVENT') {
      window.open(`/events/${this.current.targetId}`, '_blank');
    }
  }

  // ✅ Tracker la vue quand la bannière devient visible
  onBannerVisible() {
    if (!this.current?.id) return;
    this.campaignService.trackView(this.current.id).subscribe();
  }
}