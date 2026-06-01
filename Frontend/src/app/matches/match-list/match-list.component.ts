import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MatchService } from '../services/match.service';
import { Match, MatchStatus, MatchType } from '../models/match.model';
import { TerrainService } from '../../terrains/services/terrain.service';

@Component({
  selector: 'app-match-list',
  templateUrl: './match-list.component.html',
  styleUrls: ['./match-list.component.css']
})
export class MatchListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  matches:  Match[] = [];
  filtered: Match[] = [];
  paged:    Match[] = [];
  loading = false;
  error   = '';

  terrainMap: Record<string, string> = {};

  statusFilter = new FormControl('');
  typeFilter   = new FormControl('');

  page      = 1;
  pageSize  = 10;
  totalPages = 1;

  statuses: MatchStatus[] = ['PLANIFIE', 'EN_COURS', 'TERMINE', 'ANNULE', 'REPORTE'];
  types:    MatchType[]   = ['AMICAL', 'CHAMPIONNAT', 'COUPE', 'TOURNOI'];

  // Live clock data
  liveMinutes: Record<string, number> = {};
  countdowns:  Record<string, string> = {};
  private clockRef: any;

  constructor(
    private matchService: MatchService,
    private terrainService: TerrainService,
    private router: Router
  ) {}

  ngOnInit() {
    this.load();

    this.statusFilter.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilter());
    this.typeFilter.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilter());

    this.clockRef = setInterval(() => this.tick(), 1_000);
  }

  ngOnDestroy() {
    clearInterval(this.clockRef);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Clock ──────────────────────────────────────────────────────

  private tick() {
    this.matches.forEach(m => {
      if (!m.id) return;
      const start = new Date(m.dateDebut).getTime();
      const now   = Date.now();

      if (m.statut === 'EN_COURS') {
        this.liveMinutes[m.id] = Math.min(Math.floor((now - start) / 60_000), 120);
      }

      if (m.statut === 'PLANIFIE') {
        const diff = start - now;
        if (diff <= 0) {
          this.countdowns[m.id] = 'Imminent';
        } else {
          const d = Math.floor(diff / 86_400_000);
          const h = Math.floor((diff % 86_400_000) / 3_600_000);
          const min = Math.floor((diff % 3_600_000) / 60_000);
          const sec = Math.floor((diff % 60_000) / 1_000);
          if (d > 0)        this.countdowns[m.id] = `${d}j ${h}h`;
          else if (h > 0)   this.countdowns[m.id] = `${h}h ${min}m`;
          else if (min > 0) this.countdowns[m.id] = `${min}m ${sec}s`;
          else              this.countdowns[m.id] = `${sec}s`;
        }
      }
    });
  }

  // ── Momentum (score-based proxy) ──────────────────────────────

  momentumPct1(m: Match): number {
    const total = m.scoreEquipe1 + m.scoreEquipe2;
    if (!total) return 50;
    return Math.round(m.scoreEquipe1 / total * 100);
  }

  momentumPct2(m: Match): number { return 100 - this.momentumPct1(m); }

  // ── Result helper ─────────────────────────────────────────────

  resultClass(m: Match): string {
    if (m.statut !== 'TERMINE') return '';
    if (m.scoreEquipe1 > m.scoreEquipe2) return 'mc-card--win1';
    if (m.scoreEquipe2 > m.scoreEquipe1) return 'mc-card--win2';
    return 'mc-card--draw';
  }

  // ── Data ──────────────────────────────────────────────────────

  load() {
    this.loading = true;
    this.terrainService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: terrains => {
        terrains.forEach(t => { if (t.id) this.terrainMap[t.id] = t.nom; });
        this.loadMatches();
      },
      error: () => this.loadMatches()
    });
  }

  private loadMatches() {
    this.matchService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: data => { this.matches = data; this.applyFilter(); this.loading = false; this.tick(); },
      error: () => { this.error = 'Erreur lors du chargement des matchs'; this.loading = false; }
    });
  }

  applyFilter() {
    let data = [...this.matches];
    const s = this.statusFilter.value;
    const t = this.typeFilter.value;
    if (s) data = data.filter(m => m.statut === s);
    if (t) data = data.filter(m => m.type   === t);
    // Sort: EN_COURS first, then PLANIFIE, then TERMINE
    const order: Record<string, number> = { EN_COURS: 0, PLANIFIE: 1, TERMINE: 2, REPORTE: 3, ANNULE: 4 };
    data.sort((a, b) => (order[a.statut] ?? 9) - (order[b.statut] ?? 9));
    this.filtered   = data;
    this.totalPages = Math.max(1, Math.ceil(data.length / this.pageSize));
    this.page       = 1;
    this.updatePage();
  }

  updatePage() {
    const start  = (this.page - 1) * this.pageSize;
    this.paged   = this.filtered.slice(start, start + this.pageSize);
  }

  onPageChange(p: number) { this.page = p; this.updatePage(); }

  goToDetail(id: string) { this.router.navigate(['/matches', id]); }

  delete(id: string, e: Event) {
    e.stopPropagation();
    if (!confirm('Supprimer ce match ?')) return;
    this.matchService.delete(id).pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
  }

  trackById(_: number, m: Match) { return m.id; }

  hasScore(m: Match) { return m.statut === 'EN_COURS' || m.statut === 'TERMINE'; }
}
