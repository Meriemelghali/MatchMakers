import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ReservationService, EvaluationResponse, BestSlot, BaseTerrain } from '../services/reservation.service';

@Component({
  selector: 'app-selection-evaluator',
  templateUrl: './selection-evaluator.component.html',
  styleUrls: ['./selection-evaluator.component.css']
})
export class SelectionEvaluatorComponent implements OnChanges {
  @Input() terrainId?: string;
  @Input() dateTime?: string;
  @Input() allTerrains: BaseTerrain[] = [];

  evaluation?: EvaluationResponse;
  bestSlots: BestSlot[] = [];
  loading = false;

  constructor(private reservationService: ReservationService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['terrainId'] || changes['dateTime']) && this.terrainId && this.dateTime) {
      this.evaluate();
    }
  }

  evaluate(): void {
    const terrain = this.allTerrains.find(t => t.id === this.terrainId);
    if (!terrain || !this.dateTime) return;

    this.loading = true;
    this.reservationService.evaluateChoice(terrain, this.dateTime).subscribe({
      next: (res) => {
        this.evaluation = res;
        this.loading = false;
        this.loadBestSlots(terrain);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadBestSlots(terrain: any): void {
    if (!this.dateTime) return;
    this.reservationService.getBestSlots(terrain, this.dateTime).subscribe({
      next: (res) => {
        this.bestSlots = res.slots;
      }
    });
  }

  getScoreColor(score: number): string {
    if (score >= 0.8) return 'var(--green)';
    if (score >= 0.5) return 'var(--amber)';
    return 'var(--red)';
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
