import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { RewardRarity, RewardService, Reward, RewardStatus, RewardType } from '../services/reward.service';
import { Team, TeamService } from '../../teams/services/team.service';

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

  designStyle: 'CALM' | 'PRESTIGE' | 'ENERGY' | 'MINIMAL' = 'CALM';

  teams: Team[] = [];
  teamsLoading = false;
  teamsError = '';

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
    username: [''],
    teamId: [''],
    teamName: [''],
    eventId: [''],
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private rewardService: RewardService,
    private teamService: TeamService
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

    const teamId = (raw.teamId ?? '').toString().trim() || undefined;
    const teamNameFromList = teamId ? (this.teams.find(t => (t.id ?? '').toString() === teamId)?.name ?? '') : '';
    const teamName = (teamNameFromList || (raw.teamName ?? '').toString()).trim() || undefined;

    return {
      ...raw,
      points: Number.isFinite(points) ? points : undefined,
      rarity: raw.rarity ?? undefined,
      status,
      revokedReason,
      imageUrl: (raw.imageUrl ?? '').trim() || undefined,
      awardedBy: (raw.awardedBy ?? '').trim() || undefined,
      description: (raw.description ?? '').trim() || undefined,
      username: (raw.username ?? '').trim() || undefined,
      teamId,
      teamName,
      eventId: (raw.eventId ?? '').trim() || undefined
    };
  }

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

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/rewards']);
      return;
    }
    this.fetch(id);
  }

  private loadTeams(): void {
    this.teamsLoading = true;
    this.teamsError = '';
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        this.teams = (teams ?? []).filter(t => !!t && !!t.name)
          .sort((a, b) => (a.name ?? '').localeCompare((b.name ?? ''), undefined, { sensitivity: 'base' }));
        this.teamsLoading = false;

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
          username: r.username ?? '',
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

    const body = { ...this.normalizePayload(this.form.getRawValue()), userId: this.reward.userId };
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

  presetLabel(): string {
    if (this.designStyle === 'PRESTIGE') return 'Prestige';
    if (this.designStyle === 'ENERGY') return 'Énergie';
    if (this.designStyle === 'MINIMAL') return 'Minimal';
    return 'Calme';
  }

  presetAccent(): string {
    if (this.designStyle === 'PRESTIGE') return '#9775FA';
    if (this.designStyle === 'ENERGY') return '#E8500A';
    if (this.designStyle === 'MINIMAL') return '#8A95A8';
    return '#0B7285';
  }

  presetBg(): string {
    if (this.designStyle === 'PRESTIGE') return 'radial-gradient(1200px 240px at 20% 10%, rgba(151,117,250,0.22), transparent 60%), rgba(255,255,255,0.02)';
    if (this.designStyle === 'ENERGY') return 'radial-gradient(1200px 240px at 20% 10%, rgba(232,80,10,0.22), transparent 60%), rgba(255,255,255,0.02)';
    if (this.designStyle === 'MINIMAL') return 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))';
    return 'radial-gradient(1200px 240px at 20% 10%, rgba(11,114,133,0.22), transparent 60%), rgba(255,255,255,0.02)';
  }
}
