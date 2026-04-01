import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { TeamService, Team } from '../services/team.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-team-details',
  templateUrl: './team-details.component.html',
  styleUrls: ['./team-details.component.css']
})
export class TeamDetailsComponent implements OnInit, AfterViewInit, OnDestroy {

  team: Team | null = null;
  loading = false;
  saving = false;
  deleting = false;
  joining = false;
  leaving = false;
  error = '';
  success = '';
  editing = false;

  joinPlayerId = '';
  joinUsername = '';
  joinRole = 'MEMBER';

  @ViewChild('performanceChart') performanceChartRef?: ElementRef<HTMLCanvasElement>;
  private performanceChart?: Chart;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teamService: TeamService,
    private fb: FormBuilder
  ) { }

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    sport: ['', Validators.required],
    description: [''],
    logoUrl: [''],
    city: [''],
    country: [''],
    foundedYear: [null as number | null],
    coachName: [''],
    homeStadium: [''],
    websiteUrl: [''],
    contactEmail: ['', [Validators.email]],
    contactPhone: [''],
    isPublic: [true]
  });

  private normalizePayload(raw: any): any {
    const foundedYearRaw = raw.foundedYear;
    const foundedYear =
      foundedYearRaw === '' || foundedYearRaw === null || foundedYearRaw === undefined
        ? undefined
        : Number(foundedYearRaw);

    return {
      ...raw,
      foundedYear: Number.isFinite(foundedYear) ? foundedYear : undefined,
      name: (raw.name ?? '').trim(),
      sport: (raw.sport ?? '').trim(),
      description: (raw.description ?? '').trim() || undefined,
      logoUrl: (raw.logoUrl ?? '').trim() || undefined,
      city: (raw.city ?? '').trim() || undefined,
      country: (raw.country ?? '').trim() || undefined,
      coachName: (raw.coachName ?? '').trim() || undefined,
      homeStadium: (raw.homeStadium ?? '').trim() || undefined,
      websiteUrl: (raw.websiteUrl ?? '').trim() || undefined,
      contactEmail: (raw.contactEmail ?? '').trim() || undefined,
      contactPhone: (raw.contactPhone ?? '').trim() || undefined,
      isPublic: raw.isPublic ?? true
    };
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/teams']);
      return;
    }
    this.fetch(id);
  }

  ngAfterViewInit(): void {
    // Si l'équipe est déjà chargée, on peut initialiser le graphique
    if (this.team && this.performanceChartRef) {
      this.initChart();
    }
  }

  ngOnDestroy(): void {
    this.performanceChart?.destroy();
  }

  fetch(id: string): void {
    this.loading = true;
    this.error = '';
    this.teamService.getTeamById(id).subscribe({
      next: t => {
        this.team = t;
        this.loading = false;
        this.form.patchValue({
          name: t.name,
          sport: t.sport,
          description: t.description ?? '',
          logoUrl: t.logoUrl ?? '',
          city: t.city ?? '',
          country: t.country ?? '',
          foundedYear: (t.foundedYear ?? null) as any,
          coachName: t.coachName ?? '',
          homeStadium: t.homeStadium ?? '',
          websiteUrl: t.websiteUrl ?? '',
          contactEmail: t.contactEmail ?? '',
          contactPhone: t.contactPhone ?? '',
          isPublic: t.isPublic ?? true
        });
        // Si le canvas est déjà présent, on initialise / met à jour le graphique
        if (this.performanceChartRef) {
          this.initChart();
        }
      },
      error: err => {
        console.error(err);
        this.error = 'Impossible de charger cette équipe.';
        this.loading = false;
      }
    });
  }

  private initChart(): void {
    if (!this.performanceChartRef) return;

    // Détruire un éventuel chart existant pour éviter les fuites mémoire
    this.performanceChart?.destroy();

    const ctx = this.performanceChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    // Données mockées : performance de l'équipe sur les 6 derniers matchs
    const labels = ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'M'];
    const points = [1, 3, 0, 3, 2, 3]; // 3 = victoire, 1 = nul, 0 = défaite

    this.performanceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Points par match',
          data: points,
          borderColor: '#E8500A',
          backgroundColor: 'rgba(232, 80, 10, 0.2)',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#E8500A'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: '#F2F4F8', font: { size: 11 } }
          }
        },
        scales: {
          x: {
            ticks: { color: '#8A95A8', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            ticks: { color: '#8A95A8', font: { size: 11 }, stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.06)' },
            suggestedMin: 0,
            suggestedMax: 3
          }
        }
      }
    });
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    this.success = '';
    this.error = '';
    if (this.editing && this.team) {
      this.form.patchValue({
        name: this.team.name,
        sport: this.team.sport,
        description: this.team.description ?? '',
        logoUrl: this.team.logoUrl ?? '',
        city: this.team.city ?? '',
        country: this.team.country ?? '',
        foundedYear: (this.team.foundedYear ?? null) as any,
        coachName: this.team.coachName ?? '',
        homeStadium: this.team.homeStadium ?? '',
        websiteUrl: this.team.websiteUrl ?? '',
        contactEmail: this.team.contactEmail ?? '',
        contactPhone: this.team.contactPhone ?? '',
        isPublic: this.team.isPublic ?? true
      });
    }
  }

  save(): void {
    if (!this.team || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const body = this.normalizePayload(this.form.getRawValue());
    this.teamService.updateTeam(this.team.id!, body).subscribe({
      next: t => {
        this.team = t;
        this.saving = false;
        this.editing = false;
        this.success = 'Equipe mise a jour.';
      },
      error: err => {
        console.error(err);
        this.saving = false;
        this.error = err?.error?.message || err?.message || 'La mise a jour a echoue.';
      }
    });
  }

  delete(): void {
    if (!this.team || this.deleting) return;
    if (!confirm('Supprimer definitivement cette equipe ?')) return;

    this.deleting = true;
    this.error = '';
    this.success = '';

    this.teamService.deleteTeam(this.team.id!).subscribe({
      next: () => {
        this.deleting = false;
        this.router.navigate(['/teams']);
      },
      error: err => {
        console.error(err);
        this.deleting = false;
        this.error = 'La suppression a echoue.';
      }
    });
  }

  join(): void {
    if (!this.team || this.joining) return;

    this.joining = true;
    this.error = '';
    this.success = '';

    this.teamService.joinTeam(this.team.id!, {
      playerId: this.joinPlayerId || undefined,
      username: this.joinUsername || undefined,
      role: this.joinRole || undefined
    }).subscribe({
      next: t => {
        this.team = t;
        this.joining = false;
        this.success = 'Membre ajoute.';
      },
      error: err => {
        console.error(err);
        this.joining = false;
        this.error = 'Impossible de rejoindre l equipe.';
      }
    });
  }

  leave(): void {
    if (!this.team || this.leaving) return;

    this.leaving = true;
    this.error = '';
    this.success = '';

    this.teamService.leaveTeam(this.team.id!, { playerId: this.joinPlayerId || undefined }).subscribe({
      next: t => {
        this.team = t;
        this.leaving = false;
        this.success = 'Membre retire.';
      },
      error: err => {
        console.error(err);
        this.leaving = false;
        this.error = 'Impossible de quitter l equipe.';
      }
    });
  }

  membersCount(): number {
    return this.team?.members?.length ?? 0;
  }
}

