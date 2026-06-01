import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from '../services/club.service';
import { Club } from '../models/club.model';
import { SportService } from '../../sports/services/sport.service';
import { Sport } from '../../sports/sport.model';

import { AIService } from '../../../core/services/AIService/ai.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-club-form',
  templateUrl: './club-form.component.html',
  styleUrls: ['./club-form.component.css']
})
export class ClubFormComponent implements OnInit {
  clubForm!: FormGroup;
  isEditMode = false;
  clubId: string | null = null;
  sports: Sport[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;

  // Nano Banana AI
  generatingLogo = false;
  aiGeneratedLogo: any = null;
  rawAiUrl: string | null = null;
  logoPreview: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private clubService: ClubService,
    private sportService: SportService,
    private aiService: AIService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initForm();
  }

  initForm(): void {
    this.clubForm = this.fb.group({
      nameClub: ['', Validators.required],
      city: ['', Validators.required],
      descriptionClub: ['', Validators.required],
      sportIds: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadSports();
    this.clubId = this.route.snapshot.paramMap.get('id');
    if (this.clubId) {
      this.isEditMode = true;
      this.loadClub(this.clubId);
    }
  }

  loadSports(): void {
    this.sportService.getAll().subscribe({
      next: (data: Sport[]) => {
        this.sports = data;
      },
      error: (err: any) => {
        console.error('Error loading sports:', err);
        this.error = 'Failed to load sports list.';
      }
    });
  }

  loadClub(id: string): void {
    this.loading = true;
    this.clubService.getById(id).subscribe({
      next: (club: any) => {
        this.clubForm.patchValue({
          nameClub: club.nameClub,
          city: club.city,
          descriptionClub: club.descriptionClub,
          sportIds: club.sports?.map((s: any) => s.id) || []
        });
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load club details.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.clubForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    const token = localStorage.getItem('access_token') || '';

    if (this.isEditMode && this.clubId) {
      const formValue = this.clubForm.value;
      const updatedClub: any = {
        ...formValue,
        sports: formValue.sportIds.map((id: string) => ({ id }))
      };
      delete updatedClub.sportIds;

      this.clubService.update(this.clubId, updatedClub).subscribe({
        next: (res: any) => {
          if (this.selectedFile && this.clubId) {
            this.clubService.uploadLogo(this.clubId, this.selectedFile).subscribe(() => {
              this.success = 'Club and logo updated successfully!';
              setTimeout(() => this.router.navigate(['/clubs']), 1500);
            });
          } else {
            this.success = 'Club updated successfully!';
            setTimeout(() => this.router.navigate(['/clubs']), 1500);
          }
        },
        error: (err: any) => {
          this.error = 'Error updating club.';
          this.loading = false;
        }
      });
    } else {
      const formValue = this.clubForm.value;
      const newClubDto = {
        ...formValue,
        sports: formValue.sportIds.map((id: string) => ({ id }))
      };
      delete newClubDto.sportIds;

      this.clubService.create(newClubDto, token).subscribe({
        next: (res: any) => {
          if (this.selectedFile && res.id) {
            this.clubService.uploadLogo(res.id, this.selectedFile).subscribe(() => {
              this.success = 'Club and logo created successfully!';
              setTimeout(() => this.router.navigate(['/clubs']), 1500);
            });
          } else if (this.logoPreview && (this.logoPreview.startsWith('http') || this.logoPreview.startsWith('data:')) && res.id) {
            // Case where AI logo was applied but not yet saved (new club)
            this.clubService.saveLogoFromUrl(res.id, this.logoPreview).subscribe(() => {
              this.success = 'Club and AI logo created successfully!';
              setTimeout(() => this.router.navigate(['/clubs']), 1500);
            });
          } else {
            this.success = 'Club created successfully!';
            setTimeout(() => this.router.navigate(['/clubs']), 1500);
          }
        },
        error: (err: any) => {
          this.error = 'Error creating club.';
          this.loading = false;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/clubs']);
  }

  onSportToggle(sportId: string, event: any): void {
    const selectedIds = this.clubForm.get('sportIds')?.value as string[];
    if (event.target.checked) {
      this.clubForm.get('sportIds')?.setValue([...selectedIds, sportId]);
    } else {
      this.clubForm.get('sportIds')?.setValue(selectedIds.filter(id => id !== sportId));
    }
  }

  isSportSelected(sportId: string): boolean {
    const selectedIds = this.clubForm.get('sportIds')?.value as string[];
    return selectedIds.includes(sportId);
  }

  // --- NANO BANANA AI ---
  generateLogoWithAI(): void {
    const name = this.clubForm.get('nameClub')?.value;
    const desc = this.clubForm.get('descriptionClub')?.value;
    const sportIds = this.clubForm.get('sportIds')?.value as string[];
    const selectedSportsNames = this.sports
      .filter(s => sportIds.includes(s.id))
      .map(s => s.nameSport);

    this.generatingLogo = true;
    this.aiService.generateClubLogo(name, desc, selectedSportsNames).subscribe({
      next: (res: any) => {
        if (res && res.imageUrl) {
          console.log('Nano Banana - Logo URL generated:', res.imageUrl);
          this.rawAiUrl = res.imageUrl;
          this.aiGeneratedLogo = this.sanitizer.bypassSecurityTrustUrl(res.imageUrl);
        } else {
          this.error = 'L\'IA n\'a pas pu générer d\'image. Veuillez réessayer.';
        }
        this.generatingLogo = false;
      },
      error: () => {
        this.error = 'Failed to generate logo. Please try again.';
        this.generatingLogo = false;
      }
    });
  }

  applyAiLogo(): void {
    if (!this.rawAiUrl) return;
    this.logoPreview = this.rawAiUrl;
    this.selectedFile = null; 
    if (this.isEditMode && this.clubId) {
      this.clubService.saveLogoFromUrl(this.clubId, this.rawAiUrl).subscribe({
        next: () => {
          this.success = 'AI Logo applied successfully!';
          this.aiGeneratedLogo = null;
        }
      });
    } else {
      this.aiGeneratedLogo = null;
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
  onLogoError(event: any): void {
    console.error('Image failed to load');
  }
}
