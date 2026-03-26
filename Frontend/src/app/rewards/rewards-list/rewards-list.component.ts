import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RewardService, Reward } from '../services/reward.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-rewards-list',
  templateUrl: './rewards-list.component.html',
  styleUrls: ['./rewards-list.component.css']
})
export class RewardsListComponent implements OnInit, AfterViewInit, OnDestroy {

  rewards: Reward[] = [];
  base: Reward[] = [];
  filtered: Reward[] = [];
  visible: Reward[] = [];
  loading = false;
  error = '';

  playerId = '';
  teamId = '';
  q = '';
  typeFilter: '' | Reward['type'] = '';
  rarityFilter = '';
  statusFilter = '';
  sort: 'DATE_DESC' | 'DATE_ASC' | 'POINTS_DESC' = 'DATE_DESC';

  page = 1;
  pageSize = 12;
  totalPages = 1;

  @ViewChild('typeChart') typeChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('teamChart') teamChartRef?: ElementRef<HTMLCanvasElement>;

  private typeChart?: Chart;
  private teamChart?: Chart;

  constructor(private rewardService: RewardService) { }

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    if (this.filtered.length > 0) {
      this.buildCharts();
    }
  }

  ngOnDestroy(): void {
    this.typeChart?.destroy();
    this.teamChart?.destroy();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.rewardService.getRewards().subscribe({
      next: data => {
        this.rewards = data;
        this.base = data;
        this.page = 1;
        this.applyLocalFilters();
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.error = 'Impossible de charger les récompenses.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    if (this.playerId) {
      this.loading = true;
      this.rewardService.getRewardsByPlayer(this.playerId).subscribe({
        next: data => {
          this.base = data;
          this.page = 1;
          this.applyLocalFilters();
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.error = 'Erreur lors du filtrage par joueur.';
          this.loading = false;
        }
      });
      return;
    }

    if (this.teamId) {
      this.loading = true;
      this.rewardService.getRewardsByTeam(this.teamId).subscribe({
        next: data => {
          this.base = data;
          this.page = 1;
          this.applyLocalFilters();
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.error = 'Erreur lors du filtrage par équipe.';
          this.loading = false;
        }
      });
      return;
    }

    this.base = this.rewards;
    this.applyLocalFilters();
  }

  resetFilters(): void {
    this.playerId = '';
    this.teamId = '';
    this.q = '';
    this.typeFilter = '';
    this.rarityFilter = '';
    this.statusFilter = '';
    this.sort = 'DATE_DESC';
    this.page = 1;
    this.base = this.rewards;
    this.applyLocalFilters();
  }

  applyLocalFilters(): void {
    const q = this.q.trim().toLowerCase();
    let list = [...this.base];

    if (q) {
      list = list.filter(r =>
        (r.name ?? '').toLowerCase().includes(q) ||
        (r.playerName ?? '').toLowerCase().includes(q) ||
        (r.teamName ?? '').toLowerCase().includes(q)
      );
    }

    if (this.typeFilter) {
      list = list.filter(r => r.type === this.typeFilter);
    }

    if (this.rarityFilter) {
      list = list.filter(r => (r.rarity ?? '') === this.rarityFilter);
    }

    if (this.statusFilter) {
      list = list.filter(r => (r.status ?? '') === this.statusFilter);
    }

    list.sort((a, b) => {
      const da = a.dateAwarded ? new Date(a.dateAwarded).getTime() : 0;
      const db = b.dateAwarded ? new Date(b.dateAwarded).getTime() : 0;
      if (this.sort === 'DATE_ASC') return da - db;
      if (this.sort === 'POINTS_DESC') return (b.points ?? 0) - (a.points ?? 0);
      return db - da;
    });

    this.filtered = list;
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    if (this.page > this.totalPages) this.page = this.totalPages;
    if (this.page < 1) this.page = 1;
    const start = (this.page - 1) * this.pageSize;
    this.visible = this.filtered.slice(start, start + this.pageSize);

    this.buildCharts();
  }

  setPage(p: number): void {
    this.page = p;
    this.applyLocalFilters();
  }

  private buildCharts(): void {
    // Pas encore de canvas dispo (vue pas encore rendue)
    if (!this.typeChartRef || !this.teamChartRef) {
      return;
    }

    this.typeChart?.destroy();
    this.teamChart?.destroy();

    const byType = new Map<string, number>();
    const byTeam = new Map<string, number>();

    for (const r of this.filtered) {
      const typeKey = r.type ?? 'AUTRE';
      byType.set(typeKey, (byType.get(typeKey) ?? 0) + 1);

      const teamKey = r.teamName || r.teamId || 'Sans équipe';
      byTeam.set(teamKey, (byTeam.get(teamKey) ?? 0) + 1);
    }

    const typeLabels = Array.from(byType.keys());
    const typeValues = Array.from(byType.values());

    const teamLabels = Array.from(byTeam.keys());
    const teamValues = Array.from(byTeam.values());

    const typeCtx = this.typeChartRef.nativeElement.getContext('2d');
    const teamCtx = this.teamChartRef.nativeElement.getContext('2d');

    if (typeCtx) {
      this.typeChart = new Chart(typeCtx, {
        type: 'doughnut',
        data: {
          labels: typeLabels,
          datasets: [{
            data: typeValues,
            backgroundColor: [
              '#E8500A',
              '#0B7285',
              '#364FC7',
              '#A61E4D',
              '#2B8A3E',
              '#9775FA'
            ]
          }]
        },
        options: {
          plugins: {
            legend: {
              labels: { color: '#F2F4F8', font: { size: 11 } }
            }
          }
        }
      });
    }

    if (teamCtx) {
      this.teamChart = new Chart(teamCtx, {
        type: 'bar',
        data: {
          labels: teamLabels,
          datasets: [{
            label: 'Récompenses par équipe',
            data: teamValues,
            backgroundColor: '#E8500A'
          }]
        },
        options: {
          plugins: {
            legend: {
              labels: { color: '#F2F4F8', font: { size: 11 } }
            }
          },
          scales: {
            x: {
              ticks: { color: '#8A95A8', font: { size: 11 } }
            },
            y: {
              ticks: { color: '#8A95A8', font: { size: 11 }, stepSize: 1 },
              suggestedMin: 0
            }
          }
        }
      });
    }
  }
}

