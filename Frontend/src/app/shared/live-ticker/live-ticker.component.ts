import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatchService } from '../../matches/services/match.service';
import { Match } from '../../matches/models/match.model';

@Component({
  selector: 'app-live-ticker',
  templateUrl: './live-ticker.component.html',
  styleUrls: ['./live-ticker.component.css']
})
export class LiveTickerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  liveMatches: Match[] = [];
  liveMinutes: Record<string, number> = {};

  private pollRef: any;
  private clockRef: any;

  constructor(private matchService: MatchService, private router: Router) {}

  ngOnInit() {
    this.poll();
    this.pollRef  = setInterval(() => this.poll(), 30_000);
    this.clockRef = setInterval(() => this.tick(), 1_000);
  }

  ngOnDestroy() {
    clearInterval(this.pollRef);
    clearInterval(this.clockRef);
    document.body.style.paddingTop = '';
    this.destroy$.next();
    this.destroy$.complete();
  }

  private poll() {
    this.matchService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: matches => {
        this.liveMatches = matches.filter(m => m.statut === 'EN_COURS');
        this.tick();
        document.body.style.paddingTop = this.liveMatches.length ? '34px' : '';
      },
      error: () => {}
    });
  }

  private tick() {
    this.liveMatches.forEach(m => {
      if (!m.id) return;
      const elapsed = Math.max(0, Date.now() - new Date(m.dateDebut).getTime());
      this.liveMinutes[m.id] = Math.min(Math.floor(elapsed / 60_000), 120);
    });
  }

  navigate(id?: string) {
    if (id) this.router.navigate(['/matches', id]);
  }

  trackById(_: number, m: Match) { return m.id; }
}
