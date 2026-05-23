import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RewardRarity, RewardService, RewardType } from '../services/reward.service';
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { RewardsAiService, RewardsSuggestResponse } from '../services/rewards-ai.service';
import { Team, TeamService } from '../../teams/services/team.service';

@Component({
  selector: 'app-create-reward',
  templateUrl: './create-reward.component.html',
  styleUrls: ['./create-reward.component.css']
})
export class CreateRewardComponent implements OnInit {

  loading = false;
  error = '';
  success = false;

  teams: Team[] = [];
  teamsLoading = false;
  teamsError = '';

  aiOpen = false;
  aiLoading = false;
  aiError = '';
  aiMeta = '';
  aiGoal = "Valoriser une progression, un effort ou un esprit d'equipe.";
  aiSuggestion: RewardsSuggestResponse | null = null;
  aiProvider = '';
  aiModel = '';

  types: RewardType[] = [
    'TROPHY',
    'MEDAL',
    'CERTIFICATE',
    'MVP',
    'BEST_PLAYER',
    'BEST_TEAM'
  ];

  rarities: RewardRarity[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['', Validators.required],
    description: [''],
    dateAwarded: ['', Validators.required],
    points: [null as number | null, [Validators.min(0)]],
    rarity: [null as RewardRarity | null],
    imageUrl: [''],
    awardedBy: [''],
    username: [''],
    teamId: [''],
    teamName: [''],
    eventId: ['']
  });

  constructor(
    private fb: FormBuilder,
    private rewardService: RewardService,
    private router: Router,
    private auth: AuthService,
    private rewardsAi: RewardsAiService,
    private teamService: TeamService
  ) { }

  ngOnInit(): void {
    this.loadTeams();

    this.form.controls.teamId.valueChanges.subscribe((teamId) => {
      const id = (teamId ?? '').toString().trim();
      if (!id) {
        this.form.patchValue({ teamName: '' }, { emitEvent: false });
        return;
      }
      const t = this.teams.find(x => (x.id ?? '').toString() === id);
      if (t?.name) {
        this.form.patchValue({ teamName: t.name }, { emitEvent: false });
      }
    });
  }

  private loadTeams(): void {
    this.teamsLoading = true;
    this.teamsError = '';
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        this.teams = (teams ?? []).filter(t => !!t && !!t.name)
          .sort((a, b) => (a.name ?? '').localeCompare((b.name ?? ''), undefined, { sensitivity: 'base' }));
        this.teamsLoading = false;

        // If teamId already selected (rare), sync teamName.
        const currentId = (this.form.controls.teamId.value ?? '').toString().trim();
        if (currentId) {
          const t = this.teams.find(x => (x.id ?? '').toString() === currentId);
          if (t?.name) this.form.patchValue({ teamName: t.name }, { emitEvent: false });
        }
      },
      error: (err) => {
        console.error(err);
        this.teamsError = "Impossible de charger la liste des equipes.";
        this.teamsLoading = false;
      }
    });
  }

  private displayName(): string {
    const firstName = (localStorage.getItem('firstName') ?? '').trim();
    const lastName = (localStorage.getItem('lastName') ?? '').trim();
    const full = `${firstName} ${lastName}`.trim();
    if (full) return full;
    const email = (localStorage.getItem('userEmail') ?? '').trim();
    return email || 'User';
  }

  private normalizePayload(raw: any): any {
    const pointsRaw = raw.points;
    const points =
      pointsRaw === '' || pointsRaw === null || pointsRaw === undefined
        ? undefined
        : Number(pointsRaw);

    const teamId = (raw.teamId ?? '').toString().trim() || undefined;
    const teamNameFromList = teamId ? (this.teams.find(t => (t.id ?? '').toString() === teamId)?.name ?? '') : '';
    const teamName = (teamNameFromList || (raw.teamName ?? '').toString()).trim() || undefined;

    return {
      ...raw,
      points: Number.isFinite(points) ? points : undefined,
      rarity: raw.rarity ?? undefined,
      imageUrl: (raw.imageUrl ?? '').trim() || undefined,
      awardedBy: (raw.awardedBy ?? '').trim() || undefined,
      description: (raw.description ?? '').trim() || undefined,
      username: (raw.username ?? '').trim() || undefined,
      teamId,
      teamName,
      eventId: (raw.eventId ?? '').trim() || undefined
    };
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = false;

    const userId = this.auth.getUserId();
    if (!userId) {
      this.loading = false;
      this.error = 'Connecte-toi pour creer une recompense.';
      return;
    }

    this.form.patchValue({
      username: this.displayName()
    });

    const body = { ...this.normalizePayload(this.form.getRawValue()), userId };
    this.rewardService.createReward(body).subscribe({
      next: reward => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/rewards', reward.id]), 800);
      },
      error: err => {
        console.error(err);
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'La création de la récompense a échoué.';
      }
    });
  }

  openAi(): void {
    this.aiOpen = true;
    this.aiError = '';
    this.aiMeta = '';
    this.aiSuggestion = null;

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

  generateAi(): void {
    this.aiLoading = true;
    this.aiError = '';
    this.aiMeta = '';
    this.aiSuggestion = null;

    const v = this.form.getRawValue();
    const body = {
      goal: (this.aiGoal ?? '').trim() || undefined,
      type: (v.type as any) || undefined,
      teamName: (v.teamName ?? '').trim() || undefined,
      dateAwarded: (v.dateAwarded ?? '').trim() || undefined,
      currentName: (v.name ?? '').trim() || undefined,
      currentDescription: (v.description ?? '').trim() || undefined,
      currentPoints: (v.points as any) ?? undefined,
      currentRarity: (v.rarity as any) ?? undefined
    };

    this.rewardsAi.suggest(body).subscribe({
      next: (resp) => {
        this.aiSuggestion = resp;
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

  applyAi(mode: 'REPLACE' | 'FILL_EMPTY'): void {
    if (!this.aiSuggestion) return;

    const patch: any = {
      name: this.aiSuggestion.name,
      description: this.aiSuggestion.description,
      points: this.aiSuggestion.points,
      rarity: this.aiSuggestion.rarity ?? null,
      awardedBy: this.aiSuggestion.awardedBy ?? ''
    };

    if (mode === 'FILL_EMPTY') {
      const current = this.form.getRawValue();
      for (const k of Object.keys(patch)) {
        const cur = (current as any)[k];
        const isEmpty = cur === null || cur === undefined || (typeof cur === 'string' && !cur.trim());
        if (!isEmpty) delete patch[k];
      }
    }

    this.form.patchValue(patch);
    this.closeAi();
  }
}
