import { Component, OnInit } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MatchService } from '../../../matches/services/match.service';
import { Match } from '../../../matches/models/match.model';
import { RewardService, Reward } from '../../rewards/services/reward.service';
import { TeamService, Team } from '../../teams/services/team.service';
import { environment } from '../../../../environments/environment';

type Period = 'WEEK' | 'MONTH' | 'ALL';

interface TeamStanding {
  rank: number;
  name: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
}

interface PlayerStanding {
  rank: number;
  name: string;
  team?: string;
  points: number;
  rewards: number;
}

interface SpotlightCard {
  title: string;
  subtitle: string;
  value: string;
  meta: string;
}

interface AiInsight {
  title: string;
  body: string;
  level: 'INFO' | 'ACTION' | 'WARN';
}

interface AiApiResponse {
  answer: string;
  fromLlm?: boolean;
  from_llm?: boolean;
  model?: string | null;
}

@Component({
  selector: 'app-leaderboard',
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css']
})
export class LeaderboardComponent implements OnInit {

  period: Period = 'WEEK';
  loading = false;
  error = '';
  lastUpdated: Date | null = null;

  spotlights: SpotlightCard[] = [];
  topTeams: TeamStanding[] = [];
  topPlayers: PlayerStanding[] = [];

  allTeams: Team[] = [];
  teamOptions: string[] = [];
  private allStandings: TeamStanding[] = [];
  private periodStandings: TeamStanding[] = [];

  aiTeam = '';
  aiMode: 'COACH' | 'SCOUT' | 'SIM' = 'COACH';
  aiInsights: AiInsight[] = [];

  llmQuestion = '';
  llmAnswer = '';
  llmLoading = false;
  llmError = '';
  llmMeta = '';
  llmContext = '';

  simTeam = '';
  simWins = 0;
  simDraws = 0;
  simLosses = 0;
  simGoalsFor = 0;
  simGoalsAgainst = 0;
  simResult: { basePoints: number; newPoints: number; delta: number } | null = null;

  private teamsByName = new Map<string, Team>();
  private teamsByKey = new Map<string, Team>();
  private aiHttp: HttpClient;

  constructor(
    private matchService: MatchService,
    private rewardService: RewardService,
    private teamService: TeamService,
    httpBackend: HttpBackend
  ) {
    this.aiHttp = new HttpClient(httpBackend);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      matches: this.matchService.getAll(),
      rewards: this.rewardService.getRewards(),
      teams: this.teamService.getTeams()
    }).subscribe({
      next: ({ matches, rewards, teams }) => {
        this.allTeams = teams ?? [];
        this.teamsByName = new Map(this.allTeams.map(t => [t.name, t]));
        this.teamsByKey = new Map(this.allTeams.map(t => [this.normKey(t.name), t]));

        const { start, prevStart, prevEnd, label } = this.getPeriodRange(this.period);
        const { start: weekStart } = this.getPeriodRange('WEEK');
        const { start: monthStart } = this.getPeriodRange('MONTH');

        const standings = this.computeTeamStandings(matches ?? [], start);
        this.periodStandings = standings.map((t, i) => ({ ...t, rank: i + 1 }));
        this.topTeams = this.periodStandings.slice(0, 10);

        const players = this.computePlayerStandings(rewards ?? [], start);
        this.topPlayers = players.slice(0, 10).map((p, i) => ({ ...p, rank: i + 1 }));

        this.allStandings = this.computeTeamStandings(matches ?? [], null).map((t, i) => ({ ...t, rank: i + 1 }));

        const prevStandings = this.computeTeamStandings(matches ?? [], prevStart, prevEnd);
        const weekStandings = this.computeTeamStandings(matches ?? [], weekStart);
        const monthStandings = this.computeTeamStandings(matches ?? [], monthStart);
        this.spotlights = this.buildSpotlights(weekStandings, monthStandings, standings, prevStandings, label);

        this.teamOptions = this.buildTeamOptions();

        // AI defaults: pick best team if nothing selected.
        const defaultTeam = standings[0]?.name ?? this.teamOptions[0] ?? '';
        if (!this.aiTeam) this.aiTeam = defaultTeam;
        if (!this.simTeam) this.simTeam = defaultTeam;
        if (!this.llmQuestion) {
          this.llmQuestion = `Resume le classement (${this.period}) et donne 3 actions pour ${defaultTeam}.`;
        }
        this.refreshAi();
        this.refreshSim();

        this.lastUpdated = new Date();
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.error = 'Impossible de charger les donnees du classement.';
        this.loading = false;
      }
    });
  }

  onPeriodChange(p: Period): void {
    this.period = p;
    this.load();
  }

  teamRoute(name: string): any[] | null {
    const team = this.teamsByKey.get(this.normKey(name));
    return team?.id ? ['/teams', team.id] : null;
  }

  llmPreset(q: string): void {
    this.llmQuestion = q;
    this.askLlm();
  }

  askLlm(): void {
    const q = (this.llmQuestion ?? '').trim();
    if (!q) return;

    this.llmLoading = true;
    this.llmError = '';
    this.llmAnswer = '';
    this.llmMeta = '';
    this.llmContext = this.buildContextSnapshot();

    const base = environment.aiServiceUrl as string | undefined;
    const url = base && base.trim().length ? `${base.replace(/\/$/, '')}/leaderboard` : `${environment.matchServiceUrl}/ai/leaderboard`;
    const body = {
      question: q,
      context: this.llmContext
    };

    // Security: bypass interceptors so we don't leak Authorization tokens to PythonAI.
    this.aiHttp.post<AiApiResponse>(url, body).subscribe({
      next: (resp) => {
        this.llmAnswer = (resp?.answer ?? '').trim();
        const from = (resp as any)?.fromLlm ?? (resp as any)?.from_llm ?? false;
        const origin = from ? 'LLM local' : 'Fallback';
        const model = resp?.model ? ` • ${resp.model}` : '';
        this.llmMeta = `${origin}${model}`;
        this.llmLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.llmError = 'IA indisponible. Lance le service PythonAI (port 8001) avec OpenRouter (API key) ou Ollama, ou utilise le fallback.';
        this.llmLoading = false;
      }
    });
  }

  private normKey(name: string): string {
    return (name ?? '').trim().toLowerCase();
  }

  private buildContextSnapshot(): string {
    const lines: string[] = [];
    lines.push('# MatchMakers - Contexte Classement');
    lines.push('');
    lines.push(`Periode: ${this.period}`);
    lines.push(`Genere: ${new Date().toISOString()}`);
    if (this.spotlights?.length) {
      lines.push('');
      lines.push('## Spotlights');
      for (const s of this.spotlights) {
        lines.push(`- ${s.title}: ${s.subtitle} (${s.value})`);
      }
    }
    if (this.topTeams?.length) {
      lines.push('');
      lines.push('## Top Equipes');
      lines.push('| Rang | Equipe | Pts | MJ | V | N | D | BP | BC | GD |');
      lines.push('|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|');
      for (const t of this.topTeams.slice(0, 8)) {
        lines.push(`| ${t.rank} | ${t.name} | ${t.points} | ${t.played} | ${t.wins} | ${t.draws} | ${t.losses} | ${t.goalsFor} | ${t.goalsAgainst} | ${t.goalDiff} |`);
      }
    }
    if (this.topPlayers?.length) {
      lines.push('');
      lines.push('## Top Utilisateurs');
      lines.push('| Rang | Utilisateur | Equipe | Pts | Recompenses |');
      lines.push('|---:|---|---|---:|---:|');
      for (const p of this.topPlayers.slice(0, 6)) {
        lines.push(`| ${p.rank} | ${p.name} | ${p.team ?? '-'} | ${p.points} | ${p.rewards} |`);
      }
      if (false) {
      for (const p of this.topPlayers.slice(0, 6)) {
        lines.push(`- #${p.rank} ${p.name} (${p.team ?? '—'}): ${p.points} pts, ${p.rewards} recompense(s)`);
      }
      }
    }
    return lines.join('\n');
  }

  copyContext(): void {
    const text = (this.llmContext || this.buildContextSnapshot() || '').trim();
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => { });
  }

  copyAnswer(): void {
    const text = (this.llmAnswer ?? '').trim();
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => { });
  }

  private buildTeamOptions(): string[] {
    const fromTeams = this.allTeams.map(t => t.name).filter(Boolean);
    const fromStandings = this.allStandings.map(s => s.name).filter(Boolean);
    const merged = [...fromTeams, ...fromStandings].map(n => (n ?? '').trim()).filter(Boolean);
    const set = new Set<string>();
    for (const n of merged) set.add(n);
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }

  refreshAi(): void {
    const all = (this.periodStandings.length ? this.periodStandings : this.allStandings).map(t => ({ ...t }));
    const team = all.find(t => this.normKey(t.name) === this.normKey(this.aiTeam));

    const selectedTeamMeta = this.teamsByKey.get(this.normKey(this.aiTeam));

    if (!team) {
      this.aiInsights = [{
        title: 'No data yet',
        body: selectedTeamMeta
          ? `Aucun match termine pour ${selectedTeamMeta.name} sur cette periode. Ajoute des matchs TERMINE pour generer un classement.`
          : 'Ajoute des matchs termines et des recompenses avec points pour activer les insights.',
        level: 'INFO'
      }];
      return;
    }

    const leader = all[0];
    const aheadBy = leader ? Math.max(0, leader.points - team.points) : 0;
    const gdGap = leader ? (leader.goalDiff - team.goalDiff) : 0;

    const insights: AiInsight[] = [];

    if (this.aiMode === 'COACH') {
      const concedePerMatch = team.played > 0 ? (team.goalsAgainst / team.played) : 0;
      const scorePerMatch = team.played > 0 ? (team.goalsFor / team.played) : 0;

      insights.push({
        title: 'Coach focus',
        body: concedePerMatch > scorePerMatch
          ? `Tu encaisses plus que tu ne marques (~${concedePerMatch.toFixed(2)} vs ${scorePerMatch.toFixed(2)} / match). Priorite: defense + transitions.`
          : `Ton attaque est devant (~${scorePerMatch.toFixed(2)} vs ${concedePerMatch.toFixed(2)} / match). Priorite: stabiliser la defense pour securiser les points.`,
        level: 'ACTION'
      });

      insights.push({
        title: 'Next points plan',
        body: aheadBy === 0
          ? 'Tu es 1er. Objectif: garder le rythme, eviter les nuls.'
          : `Il te manque ~${aheadBy} point(s) pour rattraper le leader. Objectif simple: ${Math.ceil(aheadBy / 3)} victoire(s) de plus (ou equivalente).`,
        level: 'INFO'
      });

      if (gdGap > 0) {
        insights.push({
          title: 'Goal difference',
          body: `Ton goal difference est derriere le leader de ${gdGap}. En cas d egalite de points, vise 1-2 buts de marge par match.`,
          level: 'ACTION'
        });
      }

      if (team.played === 0) {
        insights.push({
          title: 'Start',
          body: 'Aucun match joue sur la periode. Plan simple: 2 matchs amicaux + 1 match de championnat pour lancer le classement.',
          level: 'ACTION'
        });
      }
    }

    if (this.aiMode === 'SCOUT') {
      const bestAttack = [...all].sort((a, b) => b.goalsFor - a.goalsFor)[0];
      const bestDefense = [...all]
        .filter(t => t.played >= 2)
        .sort((a, b) => (a.goalsAgainst / a.played) - (b.goalsAgainst / b.played))[0];

      if (bestAttack) {
        insights.push({
          title: 'Scouting: best attack',
          body: `${bestAttack.name} marque le plus (${bestAttack.goalsFor}). Si tu joues contre eux: ferme l axe, force les tirs exterieurs, joue sur contre.`,
          level: 'INFO'
        });
      }

      if (bestDefense) {
        insights.push({
          title: 'Scouting: best defense',
          body: `${bestDefense.name} encaisse le moins (≈${(bestDefense.goalsAgainst / bestDefense.played).toFixed(2)}/match). Si tu joues contre eux: set-pieces + tirs lointains.`,
          level: 'INFO'
        });
      }

      if (team.played > 0 && team.wins === 0 && team.draws > 0) {
        insights.push({
          title: 'Conversion',
          body: `Tu fais des nuls mais peu de victoires. Ajuste: pressing 10 derniere minutes + remplacements offensifs.`,
          level: 'ACTION'
        });
      }
    }

    if (this.aiMode === 'SIM') {
      insights.push({
        title: 'What-if',
        body: 'Utilise le simulateur ci-dessous pour voir l impact d une serie de victoires/nuls sur tes points.',
        level: 'INFO'
      });
    }

    if (team.played > 0 && team.goalsAgainst > team.goalsFor * 2) {
      insights.push({
        title: 'Risk flag',
        body: 'Tu encaisses beaucoup. Surveille la fatigue et les cartons, evite les sorties hasardeuses.',
        level: 'WARN'
      });
    }

    this.aiInsights = insights.slice(0, 6);
  }

  refreshSim(): void {
    const base = this.periodStandings.length ? this.periodStandings : this.allStandings;
    const team = base.find(t => this.normKey(t.name) === this.normKey(this.simTeam)) ?? base[0];
    if (!team) {
      this.simResult = null;
      return;
    }

    const basePoints = team.points;
    const deltaPoints = (Math.max(0, this.simWins) * 3) + Math.max(0, this.simDraws);
    const newPoints = basePoints + deltaPoints;
    this.simResult = { basePoints, newPoints, delta: deltaPoints };
  }

  private getPeriodRange(period: Period): { start: Date | null; prevStart: Date | null; prevEnd: Date | null; label: string } {
    const now = new Date();
    if (period === 'ALL') {
      return { start: null, prevStart: null, prevEnd: null, label: 'Saison' };
    }

    const days = period === 'WEEK' ? 7 : 30;
    const start = new Date(now);
    start.setDate(now.getDate() - days);

    const prevEnd = new Date(start);
    const prevStart = new Date(start);
    prevStart.setDate(start.getDate() - days);

    return { start, prevStart, prevEnd, label: period === 'WEEK' ? 'Semaine' : 'Mois' };
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private inRange(date: Date | null, start: Date | null, end?: Date | null): boolean {
    if (!date) return false;
    if (!start && !end) return true;
    const t = date.getTime();
    if (start && t < start.getTime()) return false;
    if (end && t >= end.getTime()) return false;
    return true;
  }

  private computeTeamStandings(matches: Match[], start: Date | null, end?: Date | null): TeamStanding[] {
    const map = new Map<string, Omit<TeamStanding, 'rank'>>();

    const getOrInit = (name: string) => {
      const key = (name ?? '').trim();
      if (!key) return null;
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          points: 0,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0
        });
      }
      return map.get(key)!;
    };

    for (const m of matches) {
      if (!m || m.statut !== 'TERMINE') continue;

      const d = this.parseDate(m.dateFin || m.dateDebut || m.updatedAt || m.createdAt);
      if (!this.inRange(d, start, end)) continue;

      const t1 = getOrInit(m.equipe1);
      const t2 = getOrInit(m.equipe2);
      if (!t1 || !t2) continue;

      const s1 = Number(m.scoreEquipe1 ?? 0);
      const s2 = Number(m.scoreEquipe2 ?? 0);

      t1.played += 1;
      t2.played += 1;
      t1.goalsFor += s1;
      t1.goalsAgainst += s2;
      t2.goalsFor += s2;
      t2.goalsAgainst += s1;

      if (s1 > s2) {
        t1.wins += 1;
        t2.losses += 1;
        t1.points += 3;
      } else if (s2 > s1) {
        t2.wins += 1;
        t1.losses += 1;
        t2.points += 3;
      } else {
        t1.draws += 1;
        t2.draws += 1;
        t1.points += 1;
        t2.points += 1;
      }
    }

    for (const entry of map.values()) {
      entry.goalDiff = entry.goalsFor - entry.goalsAgainst;
    }

    return Array.from(map.values())
      .map(t => ({ ...t, rank: 0 }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.name.localeCompare(b.name);
      });
  }

  private computePlayerStandings(rewards: Reward[], start: Date | null): PlayerStanding[] {
    const map = new Map<string, Omit<PlayerStanding, 'rank'>>();

    for (const r of rewards) {
      const d = this.parseDate(r.dateAwarded);
      if (!this.inRange(d, start, null)) continue;

      const name = ((r.username ?? '').trim() || (r.userId ?? '').trim());
      if (!name) continue;

      if (!map.has(name)) {
        map.set(name, { name, team: r.teamName, points: 0, rewards: 0 });
      }

      const p = map.get(name)!;
      p.points += Number(r.points ?? 0);
      p.rewards += 1;
      if (!p.team && r.teamName) p.team = r.teamName;
    }

    return Array.from(map.values())
      .map(p => ({ ...p, rank: 0 }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.rewards !== a.rewards) return b.rewards - a.rewards;
        return a.name.localeCompare(b.name);
      });
  }

  private buildSpotlights(week: TeamStanding[], month: TeamStanding[], current: TeamStanding[], previous: TeamStanding[], label: string): SpotlightCard[] {
    const weekTop = week[0];
    const monthTop = month[0];
    const bestAttack = [...current].sort((a, b) => b.goalsFor - a.goalsFor)[0];
    const bestDefense = [...current]
      .filter(t => t.played >= 2)
      .sort((a, b) => (a.goalsAgainst / a.played) - (b.goalsAgainst / b.played))[0];

    const prevByName = new Map(previous.map(t => [t.name, t]));
    const improved = [...current]
      .map(t => ({ t, delta: t.points - (prevByName.get(t.name)?.points ?? 0) }))
      .sort((a, b) => b.delta - a.delta)[0];

    const cards: SpotlightCard[] = [];

    if (weekTop) {
      cards.push({
        title: 'Team of the Week',
        subtitle: weekTop.name,
        value: `${weekTop.points} pts`,
        meta: `${weekTop.wins}V ${weekTop.draws}N ${weekTop.losses}D • GD ${weekTop.goalDiff}`
      });
    }

    if (monthTop) {
      cards.push({
        title: 'Team of the Month',
        subtitle: monthTop.name,
        value: `${monthTop.points} pts`,
        meta: `${monthTop.wins}V ${monthTop.draws}N ${monthTop.losses}D • GD ${monthTop.goalDiff}`
      });
    }

    if (bestAttack) {
      cards.push({
        title: `Best attack (${label})`,
        subtitle: bestAttack.name,
        value: `${bestAttack.goalsFor} buts`,
        meta: `${bestAttack.played} match(s) • ${bestAttack.points} pts`
      });
    }

    if (bestDefense) {
      cards.push({
        title: `Best defense (${label})`,
        subtitle: bestDefense.name,
        value: `${bestDefense.goalsAgainst} encaisses`,
        meta: `${bestDefense.played} match(s) • ~${(bestDefense.goalsAgainst / bestDefense.played).toFixed(2)}/match`
      });
    }

    if (improved?.t) {
      cards.push({
        title: 'Most improved',
        subtitle: improved.t.name,
        value: improved.delta >= 0 ? `+${improved.delta} pts` : `${improved.delta} pts`,
        meta: `vs periode precedente`
      });
    }

    return cards.slice(0, 4);
  }
}

