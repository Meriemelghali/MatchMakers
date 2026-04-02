import { Component, OnInit } from '@angular/core';
import { UserManagementService, User } from '../../../core/services/UserService/user-management.service';
import { AuthService } from '../../../core/services/AuthService/auth.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  isLoading = false;
  searchText = '';

  constructor(
    private userService: UserManagementService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    console.log('UserListComponent: Starting to load users...');
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        console.log('UserListComponent: Users loaded successfully', data);
        this.users = data;
        this.filteredUsers = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('UserListComponent: Error loading users', err);
        this.isLoading = false;
        alert('Error loading users: ' + (err.message || 'Unknown error'));
      }
    });
  }

  onSearch(): void {
    const search = this.searchText.toLowerCase().trim();
    if (!search) {
      this.filteredUsers = this.users;
      return;
    }
    this.filteredUsers = this.users.filter(u => 
      u.firstName.toLowerCase().includes(search) || 
      u.lastName.toLowerCase().includes(search) || 
      u.email.toLowerCase().includes(search)
    );
  }

  deleteUser(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          alert('Utilisateur supprimé avec succès');
          this.loadUsers();
        },
        error: () => alert('Erreur lors de la suppression')
      });
    }
  }

  sendCredentials(user: User): void {
    if (confirm(`Voulez-vous envoyer un email de réinitialisation de mot de passe à ${user.email} ?`)) {
      this.authService.forgotPassword(user.email).subscribe({
        next: () => alert(`Un email de réinitialisation sécurisé a été envoyé à : ${user.email}`),
        error: (err) => alert('Erreur lors de l\'envoi de l\'email : ' + (err.error?.message || err.message || 'Unknown error'))
      });
    }
  }

  assignRole(userId: string, role: string): void {
    if (confirm(`Voulez-vous promouvoir cet utilisateur au rôle ${role} ?`)) {
      this.userService.assignRole(userId, role).subscribe({
        next: () => {
          alert(`Rôle ${role} assigné avec succès !`);
          this.loadUsers();
        },
        error: (err) => alert('Erreur lors de l\'assignation du rôle')
      });
    }
  }
}
