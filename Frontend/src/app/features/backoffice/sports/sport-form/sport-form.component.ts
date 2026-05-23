import { Component, OnInit } from '@angular/core';
import { SportService } from '../../../sports/services/sport.service';
import { Sport } from '../../../sports/sport.model';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-sport-form',
  templateUrl: './sport-form.component.html',
  styleUrls: ['./sport-form.component.css']
})
export class SportFormComponent implements OnInit {
  sport: Sport = {
    id: '',
    nameSport: '',
    minPlayers: 1,
    maxPlayers: 10,
    color: '#E8500A',
    sportCategories: []
  };
  
  isEditMode: boolean = false;
  isLoading: boolean = false;
  isSaving: boolean = false;
  formSubmitted: boolean = false;
  
  presetColors: string[] = [
    '#E8500A', // Orange (MatchMakers)
    '#2563EB', // Blue
    '#16A34A', // Green
    '#DC2626', // Red
    '#7C3AED', // Purple
    '#DB2777', // Pink
    '#000000', // Black
    '#F59E0B'  // Amber
  ];

  allCategories: any[] = [];

  constructor(
    private sportService: SportService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.loadSport(id);
    }
  }

  loadCategories(): void {
    this.sportService.getAllCategories().subscribe({
      next: (data) => {
        this.allCategories = data;
      },
      error: (err) => {
        console.error('Error loading categories:', err);
      }
    });
  }

  isCategorySelected(categoryId: string): boolean {
    return this.sport.sportCategories?.some(c => c.id === categoryId) || false;
  }

  toggleCategory(category: any): void {
    if (!this.sport.sportCategories) {
      this.sport.sportCategories = [];
    }

    const index = this.sport.sportCategories.findIndex(c => c.id === category.id);
    if (index > -1) {
      this.sport.sportCategories.splice(index, 1);
    } else {
      this.sport.sportCategories.push(category);
    }
  }

  loadSport(id: string): void {
    this.isLoading = true;
    this.sportService.getById(id).subscribe({
      next: (data: Sport) => {
        this.sport = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading sport:', err);
        this.isLoading = false;
        this.router.navigate(['/backoffice/sports']);
      }
    });
  }

  saveSport(): void {
    this.formSubmitted = true;
    if (!this.sport.nameSport || this.sport.minPlayers < 1 || this.sport.maxPlayers < this.sport.minPlayers) {
      alert('Veuillez remplir correctement tous les champs obligatoires.');
      return;
    }

    this.isSaving = true;

    if (this.isEditMode) {
      this.sportService.update(this.sport.id, this.sport).subscribe({
        next: () => {
          this.isSaving = false;
          this.router.navigate(['/backoffice/sports']);
        },
        error: (err: any) => {
          console.error('Error updating sport:', err);
          this.isSaving = false;
        }
      });
    } else {
      this.sportService.create(this.sport).subscribe({
        next: () => {
          this.isSaving = false;
          this.router.navigate(['/backoffice/sports']);
        },
        error: (err: any) => {
          console.error('Error creating sport:', err);
          this.isSaving = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/backoffice/sports']);
  }
}
