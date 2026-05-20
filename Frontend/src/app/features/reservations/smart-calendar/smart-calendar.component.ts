import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import {
  ReservationService, BaseTerrain, HeatmapEntry, HeatmapSlot
} from '../services/reservation.service';

interface CalendarDay {
  date: string;        // YYYY-MM-DD
  label: string;       // "Lun 12 Mai"
  isToday: boolean;
  isPast: boolean;
}

interface GridCell {
  slot: HeatmapSlot;
  terrainId: string;
  terrainName: string;
  isSelected: boolean;
}

@Component({
  selector: 'app-smart-calendar',
  templateUrl: './smart-calendar.component.html',
  styleUrls: ['./smart-calendar.component.css']
})
export class SmartCalendarComponent implements OnInit, OnChanges {
  @Input() sportType: string = '';
  @Input() terrainId: string = '';          // Si fourni, filtre sur ce terrain
  @Input() allTerrains: BaseTerrain[] = [];
  @Output() slotSelected = new EventEmitter<{ terrainId: string; dateTime: string }>();

  // State
  days: CalendarDay[] = [];
  hours = [8, 10, 12, 14, 16, 18, 20];
  heatmapData: HeatmapEntry[] = [];
  loading = false;
  error = false;
  selectedCell: string | null = null; // "terrainId-date-hour"
  viewMode: 'heatmap' | 'list' = 'heatmap';
  startOffset = 0;  // Nombre de jours depuis aujourd'hui (pour navigation)

  private readonly userId = localStorage.getItem('userId') || '';
  private readonly DAYS_VISIBLE = 7;

  // Best slot across all terrains/times
  bestSlot: { terrainName: string; dateTime: string; score: number; verdict: string } | null = null;

  constructor(private reservationService: ReservationService) {}

  ngOnInit(): void {
    this.buildDays();
    if (this.sportType && this.terrainId) {
      this.loadHeatmap();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sportType'] || changes['terrainId'] || changes['allTerrains']) {
      if (this.allTerrains.length > 0 && this.sportType && this.terrainId) {
        this.loadHeatmap();
      }
    }
  }

  private buildDays(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.days = [];

    for (let i = this.startOffset; i < this.startOffset + this.DAYS_VISIBLE; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      
      // Utiliser le format local YYYY-MM-DD pour éviter le décalage UTC d'toISOString()
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      this.days.push({
        date: dateStr,
        label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
        isToday: i === 0 && this.startOffset === 0,
        isPast: d < today,
      });
    }
  }

  loadHeatmap(): void {
    if (!this.allTerrains.length || !this.sportType || !this.terrainId) return;

    this.loading = true;
    this.error = false;
    this.bestSlot = null;

    const now = new Date();
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startDate = this.days[0]?.date || defaultDate;
    const terrainIds = this.terrainId
      ? [this.terrainId]
      : this.allTerrains.slice(0, 5).map(t => t.id); // Limiter à 5 terrains max

    this.reservationService.getHeatmap({
      startDate,
      days: this.DAYS_VISIBLE,
      sportType: this.sportType || undefined,
      userId: this.userId || undefined,
      terrainIds,
    }).subscribe({
      next: (res) => {
        this.heatmapData = res.heatmap;
        this.computeBestSlot();
        this.loading = false;
      },
      error: (err) => {
        console.error('Heatmap error', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  private computeBestSlot(): void {
    let best: { terrainId: string; slot: HeatmapSlot } | null = null;

    for (const entry of this.heatmapData) {
      for (const slot of entry.slots) {
        if (!slot.available) continue;
        if (!best || slot.score > best.slot.score) {
          best = { terrainId: entry.terrain_id, slot };
        }
      }
    }

    if (best) {
      const terrain = this.allTerrains.find(t => t.id === best!.terrainId);
      const dateTime = `${best.slot.date}T${String(best.slot.hour).padStart(2, '0')}:00:00`;
      this.bestSlot = {
        terrainName: terrain?.nom || 'Terrain',
        dateTime,
        score: best.slot.score,
        verdict: best.slot.verdict,
      };
    }
  }

  getCell(terrainId: string, date: string, hour: number): HeatmapSlot | undefined {
    const entry = this.heatmapData.find(e => e.terrain_id === terrainId);
    return entry?.slots.find(s => s.date === date && s.hour === hour);
  }

  getCellColor(slot: HeatmapSlot | undefined): string {
    if (!slot) return 'rgba(255,255,255,0.04)';
    if (!slot.available) return 'rgba(239,68,68,0.15)';
    const s = slot.score;
    if (s >= 0.80) return 'rgba(34,197,94,0.25)';
    if (s >= 0.60) return 'rgba(245,158,11,0.20)';
    if (s >= 0.40) return 'rgba(249,115,22,0.15)';
    return 'rgba(239,68,68,0.12)';
  }

  getCellBorder(slot: HeatmapSlot | undefined): string {
    if (!slot) return '1px solid rgba(255,255,255,0.05)';
    if (!slot.available) return '1px solid rgba(239,68,68,0.2)';
    const s = slot.score;
    if (s >= 0.80) return '1px solid rgba(34,197,94,0.4)';
    if (s >= 0.60) return '1px solid rgba(245,158,11,0.3)';
    return '1px solid rgba(249,115,22,0.2)';
  }

  getScoreText(slot: HeatmapSlot | undefined): string {
    if (!slot) return '';
    if (!slot.available) return '✗';
    return Math.round(slot.score * 100) + '%';
  }

  getScoreTextColor(slot: HeatmapSlot | undefined): string {
    if (!slot || !slot.available) return '#ef4444';
    const s = slot.score;
    if (s >= 0.80) return '#22c55e';
    if (s >= 0.60) return '#f59e0b';
    return '#f97316';
  }

  selectCell(terrainId: string, date: string, hour: number): void {
    const key = `${terrainId}-${date}-${hour}`;
    const slot = this.getCell(terrainId, date, hour);
    if (!slot?.available) return;

    this.selectedCell = this.selectedCell === key ? null : key;

    if (this.selectedCell) {
      const dateTime = `${date}T${String(hour).padStart(2, '0')}:00:00`;
      this.slotSelected.emit({ terrainId, dateTime });
    }
  }

  isCellSelected(terrainId: string, date: string, hour: number): boolean {
    return this.selectedCell === `${terrainId}-${date}-${hour}`;
  }

  navigate(direction: 1 | -1): void {
    this.startOffset = Math.max(0, this.startOffset + direction * this.DAYS_VISIBLE);
    this.buildDays();
    this.loadHeatmap();
  }

  getTerrains(): BaseTerrain[] {
    if (this.terrainId) return this.allTerrains.filter(t => t.id === this.terrainId);
    return this.allTerrains.slice(0, 5);
  }

  useBestSlot(): void {
    if (!this.bestSlot) return;
    const terrain = this.allTerrains.find(t => t.nom === this.bestSlot!.terrainName);
    if (terrain) {
      this.slotSelected.emit({ terrainId: terrain.id, dateTime: this.bestSlot.dateTime });
    }
  }

  formatHour(h: number): string {
    return `${String(h).padStart(2, '0')}h`;
  }

  formatBestDateTime(dt: string): string {
    const d = new Date(dt);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
