import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RewardRarity, RewardService, RewardType } from '../services/reward.service';

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
    playerId: [''],
    playerName: [''],
    teamId: [''],
    teamName: [''],
    eventId: ['']
  });

  constructor(
    private fb: FormBuilder,
    private rewardService: RewardService,
    private router: Router
  ) { }

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
      playerId: (raw.playerId ?? '').trim() || undefined,
      playerName: (raw.playerName ?? '').trim() || undefined,
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

    const body = this.normalizePayload(this.form.getRawValue());
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
