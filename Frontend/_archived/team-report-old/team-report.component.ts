import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Reward, RewardService } from '../../rewards/services/reward.service';
import { Team, TeamService } from '../services/team.service';

@Component({
  selector: 'app-team-report',
  templateUrl: './team-report.component.html',
  styleUrls: ['./team-report.component.css']
})
export class TeamReportComponent implements OnInit {
  team: Team | null = null;
  rewards: Reward[] = [];
  loading = false;
  error = '';
  now = new Date();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teamService: TeamService,
    private rewardService: RewardService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/teams']);
      return;
    }
    this.load(id);
  }

  load(id: string): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      team: this.teamService.getTeamById(id),
      rewards: this.rewardService.getRewardsByTeam(id)
    }).subscribe({
      next: ({ team, rewards }) => {
        this.team = team;
        this.rewards = (rewards ?? []).slice().sort((a, b) => {
          const da = a.dateAwarded ? new Date(a.dateAwarded).getTime() : 0;
          const db = b.dateAwarded ? new Date(b.dateAwarded).getTime() : 0;
          return db - da;
        });
        this.now = new Date();
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'Impossible de generer le rapport.';
      }
    });
  }

  print(): void {
    window.print();
  }

  totalRewardPoints(): number {
    return this.rewards.reduce((sum, r) => sum + Number(r.points ?? 0), 0);
  }

  rewardCount(): number {
    return this.rewards.length;
  }

  rarityCount(rarity: string): number {
    return this.rewards.filter(r => (r.rarity ?? '') === rarity).length;
  }
}

