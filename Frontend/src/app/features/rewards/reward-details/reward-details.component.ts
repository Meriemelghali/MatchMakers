import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { RewardRarity, RewardService, Reward, RewardStatus, RewardType } from '../services/reward.service';

@Component({
  selector: 'app-reward-details',
  templateUrl: './reward-details.component.html',
  styleUrls: ['./reward-details.component.css']
})
export class RewardDetailsComponent implements OnInit {

  reward: Reward | null = null;
  loading = false;
  saving = false;
  deleting = false;
  error = '';
  success = '';

  types: RewardType[] = [
    'TROPHY',
    'MEDAL',
    'CERTIFICATE',
    'MVP',
    'BEST_PLAYER',
    'BEST_TEAM'
  ];

  rarities: RewardRarity[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'];
  statuses: RewardStatus[] = ['ACTIVE', 'REVOKED'];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['', Validators.required],
    description: [''],
    dateAwarded: ['', Validators.required],
    points: [null as number | null, [Validators.min(0)]],
    rarity: [null as RewardRarity | null],
    status: [null as RewardStatus | null],
    imageUrl: [''],
    awardedBy: [''],
    revokedReason: [''],
    playerId: [''],
    playerName: [''],
    teamId: [''],
    teamName: [''],
    eventId: ['']
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private rewardService: RewardService
  ) { }

  private normalizePayload(raw: any): any {
    const pointsRaw = raw.points;
    const points =
      pointsRaw === '' || pointsRaw === null || pointsRaw === undefined
        ? undefined
        : Number(pointsRaw);

    const status = raw.status ?? undefined;
    const revokedReason =
      status === 'REVOKED' ? ((raw.revokedReason ?? '').trim() || undefined) : undefined;

    return {
      ...raw,
      points: Number.isFinite(points) ? points : undefined,
      rarity: raw.rarity ?? undefined,
      status,
      revokedReason,
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/rewards']);
      return;
    }
    this.fetch(id);
  }

  private fetch(id: string): void {
    this.loading = true;
    this.error = '';
    this.rewardService.getRewardById(id).subscribe({
      next: r => {
        this.reward = r;
        this.loading = false;
        this.form.patchValue({
          name: r.name,
          type: r.type,
          description: r.description ?? '',
          dateAwarded: r.dateAwarded,
          points: r.points ?? null,
          rarity: (r.rarity ?? null) as any,
          status: (r.status ?? null) as any,
          imageUrl: r.imageUrl ?? '',
          awardedBy: r.awardedBy ?? '',
          revokedReason: r.revokedReason ?? '',
          playerId: r.playerId ?? '',
          playerName: r.playerName ?? '',
          teamId: r.teamId ?? '',
          teamName: r.teamName ?? '',
          eventId: r.eventId ?? ''
        });
      },
      error: err => {
        console.error(err);
        this.error = 'Impossible de charger cette récompense.';
        this.loading = false;
      }
    });
  }

  save(): void {
    if (!this.reward || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const body = this.normalizePayload(this.form.getRawValue());
    this.rewardService.updateReward(this.reward.id!, body).subscribe({
      next: r => {
        this.saving = false;
        this.reward = r;
        this.success = 'Récompense mise à jour.';
      },
      error: err => {
        console.error(err);
        this.saving = false;
        this.error = err?.error?.message || err?.message || 'La mise à jour a échoué.';
      }
    });
  }

  delete(): void {
    if (!this.reward || this.deleting) {
      return;
    }

    if (!confirm('Supprimer définitivement cette récompense ?')) {
      return;
    }

    this.deleting = true;
    this.error = '';
    this.success = '';

    this.rewardService.deleteReward(this.reward.id!).subscribe({
      next: () => {
        this.deleting = false;
        this.router.navigate(['/rewards']);
      },
      error: err => {
        console.error(err);
        this.deleting = false;
        this.error = 'La suppression a échoué.';
      }
    });
  }
}
