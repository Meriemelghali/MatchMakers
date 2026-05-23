import { Component, OnInit } from '@angular/core';
import { SportService } from '../../../sports/services/sport.service';
import { Sport } from '../../../sports/sport.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sport-list',
  templateUrl: './sport-list.component.html',
  styleUrls: ['./sport-list.component.css']
})
export class SportListComponent implements OnInit {
  sports: Sport[] = [];
  filteredSports: Sport[] = [];
  searchText: string = '';
  isLoading: boolean = false;
  expandedSportId: string | null = null;

  constructor(
    private sportService: SportService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadSports();
  }

  loadSports(): void {
    this.isLoading = true;
    this.sportService.getAll().subscribe({
      next: (data: Sport[]) => {
        this.sports = data;
        this.filteredSports = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading sports:', err);
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    const search = this.searchText.toLowerCase().trim();
    if (!search) {
      this.filteredSports = this.sports;
      return;
    }
    this.filteredSports = this.sports.filter(sport => 
      sport.nameSport.toLowerCase().includes(search)
    );
  }

  addSport(): void {
    this.router.navigate(['/backoffice/sports/add']);
  }

  editSport(id: string): void {
    this.router.navigate(['/backoffice/sports/edit', id]);
  }

  deleteSport(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce sport ?')) {
      this.sportService.delete(id).subscribe({
        next: () => {
          this.loadSports();
        },
        error: (err: any) => {
          console.error('Error deleting sport:', err);
          alert('Erreur lors de la suppression du sport.');
        }
      });
    }
  }

  toggleCategories(id: string): void {
    this.expandedSportId = this.expandedSportId === id ? null : id;
  }
}
