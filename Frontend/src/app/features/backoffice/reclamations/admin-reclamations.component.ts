import { Component, OnInit } from '@angular/core';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { ProfileService, UserProfile } from '../../../core/services/UserService/profile.service';
import { Reclamation, Sanction } from '../../../core/models/reclamation.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-reclamations',
  templateUrl: './admin-reclamations.component.html',
  styleUrls: ['./admin-reclamations.component.css']
})
export class AdminReclamationsComponent implements OnInit {
  urgentes: Reclamation[] = [];
  selectedUserSanctions: Sanction[] = [];
  selectedUserProfile: UserProfile | null = null;
  searchUserName: string = '';
  loading = false;
  adminComments: { [key: string]: string } = {};
  userNames: { [key: string]: string } = {};
  userProfiles: { [key: string]: UserProfile } = {};

  // Toast state
  showSuccessToast = false;
  toastMsg = '';

  activeTab: 'en-attente' | 'traitees' = 'en-attente';
  reclamationsTraitees: Reclamation[] = [];
  reclamationsEnAttente: Reclamation[] = [];
  
  // Filtres
  filteredEnAttente: Reclamation[] = [];
  filteredTraitees: Reclamation[] = [];
  filterPriority: string = '';
  filterDate: string = '';

  constructor(
    private reclamationService: ReclamationService,
    private profileService: ProfileService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    // Initialiser le filtre sur la date d'aujourd'hui (format YYYY-MM-DD pour l'input date)
    this.filterDate = new Date().toISOString().split('T')[0];
    this.loadReclamations();
  }

  loadReclamations(): void {
    this.loading = true;
    this.reclamationService.getAllReclamations().subscribe({
      next: (data: Reclamation[]) => {
        // En attente
        this.reclamationsEnAttente = data.filter(r => r.status === 'PENDING' || r.status === 'ALERTE_ADMIN');
        const priority: any = { 'HAUTE': 3, 'MOYENNE': 2, 'BASSE': 1 };
        this.reclamationsEnAttente.sort((a, b) => (priority[b.urgence || 'BASSE'] || 0) - (priority[a.urgence || 'BASSE'] || 0));

        // Traitées
        this.reclamationsTraitees = data.filter(r => r.status === 'RESOLVED' || r.status === 'AUTO_RESOLVED' || r.status === 'REJECTED');
        this.reclamationsTraitees.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

        this.urgentes = this.reclamationsEnAttente; // Compatibilité ancienne variable
        this.applyFilters();
        this.fetchUserNames();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error fetching reclamations', err);
        this.loading = false;
        this.toastService.show('Erreur lors du chargement des données', 'error');
      }
    });
  }

  setTab(tab: 'en-attente' | 'traitees'): void {
    this.activeTab = tab;
  }

  applyFilters(): void {
    const priority = this.filterPriority;
    const date = this.filterDate;

    this.filteredEnAttente = this.reclamationsEnAttente.filter(r => {
      const matchPriority = !priority || r.urgence === priority;
      const matchDate = !date || new Date(r.createdAt || '').toLocaleDateString() === new Date(date).toLocaleDateString();
      return matchPriority && matchDate;
    });

    this.filteredTraitees = this.reclamationsTraitees.filter(r => {
      const matchPriority = !priority || r.urgence === priority;
      const matchDate = !date || new Date(r.createdAt || '').toLocaleDateString() === new Date(date).toLocaleDateString();
      return matchPriority && matchDate;
    });
  }

  deleteReclamation(id: string | undefined): void {
    if (!id) return;
    if (confirm('Êtes-vous sûr de vouloir supprimer cette réclamation définitivement ?')) {
      this.reclamationService.deleteReclamation(id).subscribe({
        next: () => {
          this.triggerToast('Réclamation supprimée avec succès.');
          this.loadReclamations();
        },
        error: (err: any) => {
          console.error('Error deleting', err);
          this.toastService.show('Erreur lors de la suppression', 'error');
        }
      });
    }
  }

  fetchUserNames(): void {
    const userIds = new Set<string>();
    this.urgentes.forEach(r => {
      if (r.userId) userIds.add(r.userId);
      if (r.targetUserId) userIds.add(r.targetUserId);
    });

    userIds.forEach(id => {
      if (!this.userNames[id]) {
        this.profileService.getProfile(id).subscribe({
          next: (profile) => {
            this.userNames[id] = `${profile.firstName} ${profile.lastName}`;
            this.userProfiles[id] = profile;
          },
          error: () => this.userNames[id] = 'Joueur Inconnu'
        });
      }
    });
  }

  getUserName(userId: string | undefined): string {
    if (!userId) return 'N/A';
    // Si le nom est déjà résolu dans le cache, on le retourne
    if (this.userNames[userId] && this.userNames[userId] !== userId) {
      return this.userNames[userId];
    }
    // Si l'ID lui-même ressemble à un nom (contient des espaces ou n'est pas un format hex 24)
    if (userId.includes(' ') || userId.length !== 24) {
      return userId;
    }
    return 'Chargement...';
  }

  isNameResolved(userId: string | undefined): boolean {
    if (!userId) return false;
    return !!this.userNames[userId] && this.userNames[userId] !== userId;
  }

  searchSanctions(): void {
    if (!this.searchUserName.trim()) return;
    
    // Convertir le nom en ID (approximation basique pour la démo, idéalement le backend gère la recherche par nom)
    // Ici on cherche l'ID correspondant au nom dans notre dictionnaire
    const userId = Object.keys(this.userNames).find(key => 
      this.userNames[key].toLowerCase() === this.searchUserName.toLowerCase()
    );

    const targetId = userId || this.searchUserName; // Fallback si pas trouvé

    this.reclamationService.getUserSanctions(targetId).subscribe({
      next: (data: Sanction[]) => this.selectedUserSanctions = data,
      error: (err: any) => console.error('Error fetching sanctions', err)
    });

    this.profileService.getProfile(targetId).subscribe({
      next: (profile: UserProfile) => this.selectedUserProfile = profile,
      error: (err: any) => {
        console.error('Error fetching profile', err);
        this.selectedUserProfile = null;
      }
    });
  }

  investigateUser(userId: string | undefined): void {
    if (!userId) return;
    const name = this.getUserName(userId);
    this.searchUserName = name !== 'N/A' && name !== 'Joueur Inconnu' ? name : userId;
    
    // We pass the explicit userId to ensure exact match instead of relying on reverse name lookup
    this.reclamationService.getUserSanctions(userId).subscribe({
      next: (data: Sanction[]) => this.selectedUserSanctions = data,
      error: (err: any) => console.error('Error fetching sanctions', err)
    });

    this.profileService.getProfile(userId).subscribe({
      next: (profile: UserProfile) => this.selectedUserProfile = profile,
      error: (err: any) => {
        console.error('Error fetching profile', err);
        this.selectedUserProfile = null;
      }
    });
  }

  resolveReclamation(id: string | undefined): void {
    if (!id) return;
    const comment = this.adminComments[id] || '';
    this.reclamationService.resolveReclamation(id, comment).subscribe({
      next: () => {
        this.triggerToast('Réclamation traitée et email envoyé !');
        this.loadReclamations(); // Recharger les listes
        delete this.adminComments[id];
      },
      error: (err: any) => {
        console.error('Error resolving', err);
        this.toastService.show('Erreur lors de la résolution', 'error');
      }
    });
  }

  triggerToast(msg: string): void {
    this.toastMsg = msg;
    this.showSuccessToast = true;
    setTimeout(() => {
      this.showSuccessToast = false;
    }, 3000);
  }

  setQuickComment(id: string | undefined, text: string): void {
    if (!id) return;
    this.adminComments[id] = text;
  }

  applySanction(rec: Reclamation, type: string): void {
    if (!rec.targetUserId || !rec.id) return;

    const sanction: Sanction = {
      userId: rec.targetUserId,
      reclamationId: rec.id,
      typeSanction: type,
      motif: `Sanction manuelle (${type}) appliquée par l'administrateur.`
    };

    this.reclamationService.createSanction(sanction).subscribe({
      next: () => {
        this.resolveReclamation(rec.id);
        alert(`Sanction ${type} appliquée avec succès !`);
      },
      error: (err: any) => console.error('Error applying sanction', err)
    });
  }
}
