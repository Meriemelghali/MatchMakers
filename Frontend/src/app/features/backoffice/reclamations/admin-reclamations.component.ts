import { Component, OnInit } from '@angular/core';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation, Sanction } from '../../../core/models/reclamation.model';

@Component({
  selector: 'app-admin-reclamations',
  templateUrl: './admin-reclamations.component.html',
  styleUrls: ['./admin-reclamations.component.css']
})
export class AdminReclamationsComponent implements OnInit {
  urgentes: Reclamation[] = [];
  selectedUserSanctions: Sanction[] = [];
  searchUserName: string = '';
  loading = false;

  constructor(private reclamationService: ReclamationService) { }

  ngOnInit(): void {
    this.loadUrgentReclamations();
  }

  loadUrgentReclamations(): void {
    this.loading = true;
    this.reclamationService.getUrgentReclamations().subscribe({
      next: (data: Reclamation[]) => {
        this.urgentes = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error fetching urgent reclamations', err);
        this.loading = false;
      }
    });
  }

  searchSanctions(): void {
    if (!this.searchUserName.trim()) return;
    
    // On utilise le nom/prénom pour la recherche
    this.reclamationService.getUserSanctions(this.searchUserName).subscribe({
      next: (data: Sanction[]) => {
        this.selectedUserSanctions = data;
      },
      error: (err: any) => {
        console.error('Error fetching sanctions', err);
      }
    });
  }

  resolveReclamation(id: string | undefined): void {
    if (!id) return;
    // For simplicity, we just filter it out here. 
    // In a real app, you'd call a PUT /api/reclamations/{id} to update status to RESOLVED
    this.urgentes = this.urgentes.filter(r => r.id !== id);
  }
}
