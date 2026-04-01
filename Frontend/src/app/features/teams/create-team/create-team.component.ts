import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamService } from '../services/team.service';
import { SportService } from '../../sports/services/sport.service';
interface Sport {
  id: string;
  nameSport: string;
}
@Component({
  selector: 'app-create-team',
  templateUrl: './create-team.component.html',
  styleUrls: ['./create-team.component.css']
})
export class CreateTeamComponent implements OnInit {

  loading = false;
  error = '';
  success = false;
  logoPreview: string | null = null;
  sports: Sport[] = [];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    sportId: ['', Validators.required],
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

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private sportService: SportService,
    private router: Router
  ) { }

  private normalizePayload(raw: any): any {
    const foundedYearRaw = raw.foundedYear;
    const foundedYear =
      foundedYearRaw === '' || foundedYearRaw === null || foundedYearRaw === undefined
        ? undefined
        : Number(foundedYearRaw);
    const selectedSport = this.sports.find(s => s.id === raw.sportId);
    return {
      ...raw,
      foundedYear: Number.isFinite(foundedYear) ? foundedYear : undefined,
      name: (raw.name ?? '').trim(),
      sport: selectedSport?.nameSport ?? '',
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

  onLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.logoPreview = URL.createObjectURL(file);
      // Pour l’instant on garde seulement l’URL locale en mock
      this.form.patchValue({ logoUrl: this.logoPreview });
    }
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
    this.teamService.createTeam(body).subscribe({
      next: team => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/teams', team.id]), 800);
      },
      error: err => {
        console.error(err);
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'La création de l’équipe a échoué.';
      }
    });
  }
  ngOnInit(): void {
    this.loadSports();
  }
  loadSports(): void {
    this.sportService.getAll().subscribe({
      next: (data: Sport[]) => this.sports = data,
      error: (err: any) => console.error('Erreur chargement sports', err)
    });
  }
  onSportChange(sportId: string | null | undefined): void {
    if (!sportId) return;
    console.log('Sport sélectionné:', sportId);
  }
}

