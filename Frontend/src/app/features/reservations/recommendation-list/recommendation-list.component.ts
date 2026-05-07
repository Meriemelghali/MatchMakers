import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ReservationService, TerrainRecommendation, BaseTerrain } from '../services/reservation.service';

@Component({
  selector: 'app-recommendation-list',
  templateUrl: './recommendation-list.component.html',
  styleUrls: ['./recommendation-list.component.css']
})
export class RecommendationListComponent implements OnInit, OnChanges {
  @Input() selectedDateTime: string = new Date().toISOString();
  @Output() terrainSelected = new EventEmitter<string>();
  
  positiveRecs: TerrainRecommendation[] = [];
  negativeRecs: TerrainRecommendation[] = [];
  terrains: BaseTerrain[] = [];
  loading = false;
  showAll = false;

  constructor(private reservationService: ReservationService) { }

  ngOnInit(): void {
    this.loadTerrains();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDateTime'] && this.selectedDateTime) {
      this.fetchRecommendations();
    }
  }

  loadTerrains(): void {
    this.reservationService.getTerrains().subscribe(data => {
      this.terrains = data;
      this.fetchRecommendations();
    });
  }

  fetchRecommendations(): void {
    if (!this.selectedDateTime) return;
    
    this.loading = true;
    this.reservationService.getRecommendations(this.selectedDateTime).subscribe({
      next: (res) => {
        // Séparer les recommandations positives et les créneaux à éviter
        this.positiveRecs = res.recommandations.filter(r => r.score >= 0.5);
        this.negativeRecs = res.recommandations.filter(r => r.score < 0.5);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching recommendations', err);
        this.loading = false;
      }
    });
  }

  onSelectTerrain(id: string): void {
    this.terrainSelected.emit(id);
  }

  toggleShowAll(): void {
    this.showAll = !this.showAll;
  }

  getTerrainName(id: string): string {
    return this.terrains.find(t => t.id === id)?.nom || 'Terrain Inconnu';
  }

  getTerrainCity(id: string): string {
    return this.terrains.find(t => t.id === id)?.ville || '';
  }

  getScoreColor(score: number): string {
    if (score >= 0.8) return 'var(--green)';
    if (score >= 0.5) return 'var(--amber)';
    return 'var(--red)';
  }
}
