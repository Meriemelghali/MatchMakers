import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RewardService, Reward, RewardDashboard } from '../services/reward.service';
import Chart from 'chart.js/auto';
import { RewardsAiService } from '../services/rewards-ai.service';

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
  private chartsTimer: any = null;
  private dashboardTimer: any = null;
  dashboard: RewardDashboard | null = null;

  aiOpen = false;
  aiQuestion = '';
  aiContext = '';
  aiAnswer = '';
  aiLoading = false;
  aiError = '';
  aiMeta = '';
  aiProvider = '';
  aiModel = '';
  showAiContext = false;

  constructor(
    private rewardService: RewardService,
    private rewardsAi: RewardsAiService
  ) { }

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.scheduleCharts();
  }

  ngOnDestroy(): void {
    if (this.chartsTimer) {
      clearTimeout(this.chartsTimer);
      this.chartsTimer = null;
    }
    if (this.dashboardTimer) {
      clearTimeout(this.dashboardTimer);
      this.dashboardTimer = null;
    }
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
        this.loading = false;
        this.applyLocalFilters();
      },
      error: err => {
        console.error(err);
        this.error = 'Impossible de charger les récompenses.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    if (this.teamId) {
      this.loading = true;
      this.rewardService.getRewardsByTeam(this.teamId).subscribe({
        next: data => {
          this.base = data;
          this.page = 1;
          this.loading = false;
          this.applyLocalFilters();
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
        (r.username ?? '').toLowerCase().includes(q) ||
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

    this.refreshDashboard();
  }

  exportCsv(): void {
    const cols: Array<{ key: keyof Reward; label: string }> = [
      { key: 'name', label: 'name' },
      { key: 'type', label: 'type' },
      { key: 'dateAwarded', label: 'dateAwarded' },
      { key: 'points', label: 'points' },
      { key: 'rarity', label: 'rarity' },
      { key: 'status', label: 'status' },
      { key: 'username', label: 'username' },
      { key: 'teamName', label: 'teamName' },
      { key: 'awardedBy', label: 'awardedBy' }
    ];

    const esc = (v: any) => {
      const s = (v ?? '').toString();
      if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/\"/g, '""')}"`;
      }
      return s;
    };

    const lines: string[] = [];
    lines.push(cols.map(c => c.label).join(','));
    for (const r of this.filtered) {
      lines.push(cols.map(c => esc((r as any)[c.key])).join(','));
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `rewards_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  openAi(): void {
    this.aiOpen = true;
    this.aiError = '';
    this.aiMeta = '';
    this.aiAnswer = '';
    this.aiContext = this.buildAiContext();
    this.showAiContext = false;
    if (!this.aiQuestion.trim()) {
      this.aiQuestion = "Resume les recompenses, repere d'eventuels deseqilibres et propose 3 actions simples.";
    }

    this.rewardsAi.health().subscribe({
      next: (h) => {
        this.aiProvider = (h?.provider ?? '').toString();
        this.aiModel = (h?.provider === 'openrouter' ? (h?.openrouter_model ?? '') : (h?.ollama_model ?? '')).toString();
      },
      error: () => {
        this.aiProvider = '';
        this.aiModel = '';
      }
    });
  }

  closeAi(): void {
    this.aiOpen = false;
  }

  copyAiContext(): void {
    const text = this.aiContext ?? '';
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => { });
  }

  copyAiAnswer(): void {
    const text = this.aiAnswer ?? '';
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => { });
  }

  askAi(): void {
    const q = (this.aiQuestion ?? '').trim();
    if (!q) return;

    this.aiLoading = true;
    this.aiError = '';
    this.aiMeta = '';
    this.aiAnswer = '';
    this.aiContext = this.buildAiContext();

    this.rewardsAi.insights({ question: q, context: this.aiContext }).subscribe({
      next: (resp) => {
        this.aiAnswer = (resp?.answer ?? '').trim();
        const from = (resp as any)?.fromLlm ?? (resp as any)?.from_llm ?? false;
        const origin = from ? 'OpenRouter/Ollama' : 'Fallback';
        const model = resp?.model ? ` â€¢ ${resp.model}` : '';
        const latency = (resp as any)?.latencyMs ?? (resp as any)?.latency_ms;
        const ms = typeof latency === 'number' ? ` â€¢ ${latency}ms` : '';
        this.aiMeta = `${origin}${model}${ms}`;
        this.aiLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.aiError = "IA indisponible. Verifie PythonAI (http://127.0.0.1:8001/health).";
        this.aiLoading = false;
      }
    });
  }

  aiPreset(q: string): void {
    this.aiQuestion = q;
    this.askAi();
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

    const dash = this.dashboard ?? this.computeDashboardFromLocal();
    const typeLabels = (dash?.byType ?? []).map(i => i.label);
    const typeValues = (dash?.byType ?? []).map(i => i.count);

    const teamLabels = (dash?.byTeam ?? []).map(i => i.label);
    const teamValues = (dash?.byTeam ?? []).map(i => i.count);

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
              'rgba(232, 80, 10, 0.85)',
              'rgba(11, 114, 133, 0.70)',
              'rgba(54, 79, 199, 0.65)',
              'rgba(166, 30, 77, 0.60)',
              'rgba(43, 138, 62, 0.60)',
              'rgba(151, 117, 250, 0.60)'
            ]
          }]
        },
        options: {
          plugins: {
            legend: {
              labels: { color: '#F2F4F8', font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.formattedValue}`
              }
            }
          },
          animation: { duration: 450 }
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
            backgroundColor: 'rgba(232, 80, 10, 0.75)',
            borderColor: 'rgba(232, 80, 10, 0.95)',
            borderWidth: 1,
            borderRadius: 8
          }]
        },
        options: {
          plugins: {
            legend: {
              labels: { color: '#F2F4F8', font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${(ctx.parsed as any)?.y ?? 0} récompense(s)`
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#8A95A8', font: { size: 11 } },
              grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y: {
              ticks: { color: '#8A95A8', font: { size: 11 }, stepSize: 1 },
              suggestedMin: 0,
              grid: { color: 'rgba(255,255,255,0.06)' }
            }
          },
          animation: { duration: 450 }
        }
      });
    }
  }

  private scheduleCharts(): void {
    if (this.chartsTimer) return;
    this.chartsTimer = setTimeout(() => {
      this.chartsTimer = null;
      this.buildCharts();
    }, 0);
  }

  private refreshDashboard(): void {
    if (this.dashboardTimer) return;
    this.dashboardTimer = setTimeout(() => {
      this.dashboardTimer = null;
      this.loadDashboardFromApi();
    }, 0);
  }

  private loadDashboardFromApi(): void {
    const params = {
      teamId: this.teamId || undefined,
      q: this.q || undefined,
      type: this.typeFilter || undefined,
      rarity: this.rarityFilter || undefined,
      status: this.statusFilter || undefined
    };

    this.rewardService.getDashboard(params).subscribe({
      next: (dash) => {
        this.dashboard = dash;
        this.scheduleCharts();
      },
      error: (err) => {
        console.error(err);
        this.dashboard = null;
        this.scheduleCharts();
      }
    });
  }

  private computeDashboardFromLocal(): RewardDashboard {
    const byType = new Map<string, number>();
    const byTeam = new Map<string, number>();
    const pts: number[] = [];

    for (const r of this.filtered) {
      const typeKey = r.type ?? 'AUTRE';
      byType.set(typeKey, (byType.get(typeKey) ?? 0) + 1);

      const teamKey = r.teamName || r.teamId || 'Sans équipe';
      byTeam.set(teamKey, (byTeam.get(teamKey) ?? 0) + 1);

      if (typeof r.points === 'number' && r.points >= 0) pts.push(r.points);
    }

    const toItems = (m: Map<string, number>, top: number) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, top)
        .map(([label, count]) => ({ label, count }));

    const byTeamItems = (() => {
      const sorted = Array.from(byTeam.entries()).sort((a, b) => b[1] - a[1]);
      const top = sorted.slice(0, 10).map(([label, count]) => ({ label, count }));
      const others = sorted.slice(10).reduce((acc, cur) => acc + cur[1], 0);
      return others > 0 ? [...top, { label: 'Autres', count: others }] : top;
    })();

    const avg = pts.length ? Math.round(pts.reduce((a, b) => a + b, 0) / pts.length) : null;
    const max = pts.length ? Math.max(...pts) : null;

    return {
      total: this.filtered.length,
      byType: toItems(byType, 12),
      byTeam: byTeamItems,
      avgPoints: avg,
      maxPoints: max,
      generatedAt: new Date().toISOString()
    };
  }

  private buildAiContext(): string {
    const lines: string[] = [];
    lines.push('# MatchMakers - Contexte Recompenses');
    lines.push('');
    lines.push(`Genere: ${new Date().toISOString()}`);
    lines.push(`Total (apres filtres): ${this.filtered?.length ?? 0}`);
    lines.push('');

    const filters: string[] = [];
    if (this.teamId) filters.push(`teamId=${this.teamId}`);
    if (this.q.trim()) filters.push(`q="${this.q.trim()}"`);
    if (this.typeFilter) filters.push(`type=${this.typeFilter}`);
    if (this.rarityFilter) filters.push(`rarity=${this.rarityFilter}`);
    if (this.statusFilter) filters.push(`status=${this.statusFilter}`);
    filters.push(`sort=${this.sort}`);
    lines.push(`Filtres: ${filters.join(' • ')}`);

    const byType = new Map<string, number>();
    const byTeam = new Map<string, number>();
    let pointsCount = 0;
    let pointsSum = 0;
    let maxPoints = -1;
    let maxReward: Reward | null = null;

    for (const r of this.filtered ?? []) {
      const typeKey = r.type ?? 'AUTRE';
      byType.set(typeKey, (byType.get(typeKey) ?? 0) + 1);
      const teamKey = r.teamName || r.teamId || 'Sans equipe';
      byTeam.set(teamKey, (byTeam.get(teamKey) ?? 0) + 1);
      if (typeof r.points === 'number') {
        pointsCount += 1;
        pointsSum += r.points;
        if (r.points > maxPoints) {
          maxPoints = r.points;
          maxReward = r;
        }
      }
    }

    if (pointsCount > 0) {
      lines.push(`Points: moyenne=${Math.round(pointsSum / pointsCount)} sur ${pointsCount} recompense(s)`);
      if (maxReward) {
        lines.push(`Max points: ${maxPoints} (name="${maxReward.name}", type=${maxReward.type}, user="${maxReward.username || 'N/A'}")`);
      }
    } else {
      lines.push('Points: aucune valeur renseignee.');
    }

    const topN = (m: Map<string, number>, n: number) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);

    lines.push('');
    lines.push('## Repartition');
    lines.push('');
    lines.push('### Par type');
    for (const [k, v] of topN(byType, 8)) {
      lines.push(`- ${k}: ${v}`);
    }
    lines.push('');
    lines.push('### Par equipe');
    for (const [k, v] of topN(byTeam, 8)) {
      lines.push(`- ${k}: ${v}`);
    }

    const recent = [...(this.filtered ?? [])].sort((a, b) => {
      const da = a.dateAwarded ? new Date(a.dateAwarded).getTime() : 0;
      const db = b.dateAwarded ? new Date(b.dateAwarded).getTime() : 0;
      return db - da;
    }).slice(0, 10);

    if (recent.length) {
      lines.push('');
      lines.push('## Dernieres recompenses (10)');
      lines.push('| Date | Type | Nom | User | Equipe | Points | Rarete |');
      lines.push('|---|---|---|---|---|---:|---|');
      for (const r of recent) {
        const d = r.dateAwarded ? new Date(r.dateAwarded).toISOString().slice(0, 10) : '';
        lines.push(`| ${d} | ${r.type ?? ''} | ${r.name ?? ''} | ${r.username ?? ''} | ${r.teamName ?? ''} | ${r.points ?? ''} | ${r.rarity ?? ''} |`);
      }
    }

    lines.push('');
    lines.push('Note: ne pas demander d\'ID utilisateur, ne pas inclure de donnees sensibles.');
    return lines.join('\n');
  }

}

