import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { UserManagementService } from '../../../core/services/UserService/user-management.service';

@Component({
  selector: 'app-reclamation-form',
  templateUrl: './reclamation-form.component.html',
  styleUrls: ['./reclamation-form.component.css']
})
export class ReclamationFormComponent implements OnInit {
  reclamationForm: FormGroup;
  isSubmitting = false;
  aiResponse: string | null = null;
  aiType: string | null = null;
  aiUrgence: string | null = null;
  errorMessage: string | null = null;

  // Autocomplete users
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  showUserList = false;
  selectedUser: any | null = null;

  constructor(
    private fb: FormBuilder,
    private reclamationService: ReclamationService,
    private authService: AuthService,
    private userManagementService: UserManagementService
  ) {
    this.reclamationForm = this.fb.group({
      title: ['', Validators.required],
      customTitle: [''],
      description: ['', [Validators.required, Validators.minLength(10)]],
      targetUserId: [''], // Optional
      matchId: ['']       // Optional
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userManagementService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.filteredUsers = users;
      },
      error: (err) => console.error('Erreur chargement utilisateurs', err)
    });
  }

  onUserTyping(): void {
    const value = this.reclamationForm.get('targetUserId')?.value?.toLowerCase() || '';
    
    // On réinitialise l'utilisateur sélectionné si le texte change
    if (this.selectedUser && `${this.selectedUser.firstName} ${this.selectedUser.lastName}` !== this.reclamationForm.get('targetUserId')?.value) {
      this.selectedUser = null;
    }

    if (!value) {
      this.filteredUsers = [];
      this.showUserList = false;
      return;
    }

    // Filtrage strict : commence par la lettre tapée (prefix match)
    this.filteredUsers = this.allUsers.filter(u => 
      u.firstName.toLowerCase().startsWith(value) || 
      u.lastName.toLowerCase().startsWith(value) || 
      u.email.toLowerCase().startsWith(value)
    ).slice(0, 5); 
    
    this.showUserList = this.filteredUsers.length > 0;
  }

  selectUser(user: any): void {
    const fullName = `${user.firstName} ${user.lastName}`;
    this.reclamationForm.patchValue({
      targetUserId: fullName
    });
    this.selectedUser = user;
    this.showUserList = false;
  }

  onSubmit(): void {
    if (this.reclamationForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.aiResponse = null;
    this.errorMessage = null;

    const currentUserId = this.authService.getUserId() || 'anonymous';
    
    // Récupérer le titre final (si 'Autre', utiliser customTitle)
    let finalTitle = this.reclamationForm.get('title')?.value;
    if (finalTitle === 'Autre') {
      finalTitle = this.reclamationForm.get('customTitle')?.value || 'Autre';
    }

    // Validation stricte : si un nom est saisi mais aucun utilisateur n'est sélectionné dans la liste
    const targetInput = this.reclamationForm.get('targetUserId')?.value;
    if (targetInput && !this.selectedUser) {
      this.errorMessage = "Veuillez sélectionner un utilisateur valide dans la liste suggérée.";
      this.isSubmitting = false;
      return;
    }

    const newReclamation: Reclamation = {
      ...this.reclamationForm.value,
      title: finalTitle,
      // Si on a un utilisateur sélectionné, on envoie son ID au backend
      targetUserId: this.selectedUser ? this.selectedUser.id : targetInput,
      userId: currentUserId
    };

    this.reclamationService.createReclamation(newReclamation).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.aiResponse = res.aiResponse || 'Votre demande a bien été reçue.';
        this.aiType = res.type || null;
        this.aiUrgence = res.urgence || null;
        this.reclamationForm.reset();
      },
      error: (err) => {
        this.isSubmitting = false;
        // Gérer le message d'erreur spécifique du backend
        this.errorMessage = err.error?.message || err.message || 'Une erreur est survenue lors de l\'envoi.';
        console.error(err);
      }
    });
  }
}
