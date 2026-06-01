import { Component, OnInit } from '@angular/core';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { Reclamation } from '../../../core/models/reclamation.model';

@Component({
  selector: 'app-user-reclamations',
  templateUrl: './user-reclamations.component.html',
  styleUrls: ['./user-reclamations.component.css']
})
export class UserReclamationsComponent implements OnInit {
  reclamations: Reclamation[] = [];
  loading = false;

  constructor(
    private reclamationService: ReclamationService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadMyReclamations();
  }

  loadMyReclamations(): void {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.loading = true;
    this.reclamationService.getReclamationsByUserId(userId).subscribe({
      next: (data: Reclamation[]) => {
        // Trier par date décroissante
        this.reclamations = data.sort((a, b) => 
          new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        );
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error fetching my reclamations', err);
        this.loading = false;
      }
    });
  }

  getStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'PENDING': return 'En cours';
      case 'RESOLVED': return 'Traité';
      case 'AUTO_RESOLVED': return 'Résolu par IA';
      case 'ALERTE_ADMIN': return 'En cours (Priorité)';
      case 'REJECTED': return 'Rejeté';
      default: return status || 'Inconnu';
    }
  }

  getStatusClass(status: string | undefined): string {
    switch (status) {
      case 'PENDING': return 'badge-occupe';
      case 'RESOLVED': return 'badge-disponible';
      case 'AUTO_RESOLVED': return 'badge-disponible';
      case 'ALERTE_ADMIN': return 'badge-annule';
      case 'REJECTED': return 'badge-err';
      default: return 'badge-disponible';
    }
  }
}
