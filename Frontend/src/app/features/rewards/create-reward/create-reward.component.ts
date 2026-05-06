import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RewardRarity, RewardService, RewardType } from '../services/reward.service';
import { AuthService } from '../../../core/services/AuthService/auth.service';

@Component({
  selector: 'app-create-reward',
  templateUrl: './create-reward.component.html',
  styleUrls: ['./create-reward.component.css']
})
export class CreateRewardComponent {

  loading = false;
  error = '';
  success = false;

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

  private normalizePayload(raw: any): any {
    const pointsRaw = raw.points;
    const points =
      pointsRaw === '' || pointsRaw === null || pointsRaw === undefined
        ? undefined
        : Number(pointsRaw);

    return {
      ...raw,
      points: Number.isFinite(points) ? points : undefined,
      rarity: raw.rarity ?? undefined,
      imageUrl: (raw.imageUrl ?? '').trim() || undefined,
      awardedBy: (raw.awardedBy ?? '').trim() || undefined,
      description: (raw.description ?? '').trim() || undefined,
      username: (raw.username ?? '').trim() || undefined,
      teamId: (raw.teamId ?? '').trim() || undefined,
      teamName: (raw.teamName ?? '').trim() || undefined,
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
}
