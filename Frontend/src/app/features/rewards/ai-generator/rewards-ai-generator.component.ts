import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RewardAISuggestion, RewardService } from '../services/reward.service';
import { AuthService } from '../../../core/services/AuthService/auth.service';

type SuggestionState = 'NEW' | 'ACCEPTED' | 'REJECTED';

@Component({
  selector: 'app-rewards-ai-generator',
  templateUrl: './rewards-ai-generator.component.html',
  styleUrls: ['./rewards-ai-generator.component.css']
})
export class RewardsAiGeneratorComponent {

  loading = false;
  error = '';
  meta = '';

  suggestions: Array<RewardAISuggestion & { state: SuggestionState }> = [];

  form = this.fb.group({
    eventType: ['Tournament', [Validators.required, Validators.maxLength(60)]],
    teamCount: [6, [Validators.required, Validators.min(1), Validators.max(128)]],
    difficulty: ['MEDIUM', [Validators.required, Validators.maxLength(20)]],
    teamName: [''],
    dateAwarded: [new Date().toISOString().slice(0, 10), [Validators.required]]
  });

  constructor(
    private fb: FormBuilder,
    private rewardService: RewardService,
    private auth: AuthService
  ) { }

  private displayName(): string {
    const firstName = (localStorage.getItem('firstName') ?? '').trim();
    const lastName = (localStorage.getItem('lastName') ?? '').trim();
    const full = `${firstName} ${lastName}`.trim();
    if (full) return full;
    const email = (localStorage.getItem('userEmail') ?? '').trim();
    return email || 'User';
  }

  generate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.meta = '';
    this.suggestions = [];

    const raw = this.form.getRawValue();
    const body = {
      eventType: raw.eventType!,
      teamCount: Number(raw.teamCount ?? 2),
      difficulty: raw.difficulty!
    };

    this.rewardService.generateRewardsWithAi(body).subscribe({
      next: (items) => {
        this.suggestions = (items ?? []).map(s => ({ ...s, state: 'NEW' as const }));
        this.meta = `${this.suggestions.length} suggestion(s)`;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = "Impossible d'appeler l'IA. Assure-toi que RewardService et PythonAI sont lancés.";
        this.loading = false;
      }
    });
  }

  reject(s: any): void {
    s.state = 'REJECTED';
  }

  accept(s: any): void {
    const userId = this.auth.getUserId();
    if (!userId) {
      this.error = "Connecte-toi pour enregistrer une récompense.";
      return;
    }

    const raw = this.form.getRawValue();
    const teamName = (raw.teamName ?? '').trim();
    const dateAwarded = raw.dateAwarded!;

    this.loading = true;
    this.error = '';

    const body: any = {
      name: s.name,
      description: s.description,
      type: s.type,
      rarity: s.rarity,
      points: s.points,
      dateAwarded,
      username: this.displayName(),
      userId,
      teamName: teamName || undefined
    };

    this.rewardService.createReward(body).subscribe({
      next: () => {
        s.state = 'ACCEPTED';
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = "Enregistrement impossible. Vérifie les champs requis.";
        this.loading = false;
      }
    });
  }
}

