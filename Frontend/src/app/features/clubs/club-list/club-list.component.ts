import { Component, OnInit } from '@angular/core';
import { Club } from '../models/club.model';
import { ClubService } from '../services/club.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/AuthService/auth.service';

@Component({
  selector: 'app-club-list',
  templateUrl: './club-list.component.html',
  styleUrls: ['./club-list.component.css']
})
export class ClubListComponent implements OnInit {
  clubs: Club[] = [];
  loading = false;
  error = '';

  constructor(
    private clubService: ClubService,
    private router: Router,
    private authService: AuthService
  ) {}

  canCreateClub(): boolean {
    const role = this.authService.getUserRole()?.toUpperCase();
    return role === 'ADMIN' || role === 'RESPONSABLE';
  }

  ngOnInit(): void {
    this.loadClubs();
  }

  loadClubs(): void {
    this.loading = true;
    this.clubService.getAll().subscribe({
      next: (data: any) => {
        this.clubs = data;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load clubs. Please try again.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  createClub(): void {
    this.router.navigate(['/clubs/new']);
  }

  viewDetails(id?: string): void {
    if (id) {
      this.router.navigate(['/clubs', id]);
    }
  }

  getLogoUrl(fileName?: string): string {
    if (fileName) {
      return `http://localhost:8084/sports/api/clubs/logo/${fileName}`;
    }
    return 'assets/images/default-club.png'; // Placeholder if no logo
  }
}
