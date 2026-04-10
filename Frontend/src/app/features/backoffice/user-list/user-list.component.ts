import { Component, OnInit } from '@angular/core';
import { UserManagementService, User } from '../../../core/services/UserService/user-management.service';
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { RoleService } from '../../../core/services/role.service';
import { Role } from '../../../core/models/role.model';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  availableRoles: Role[] = [];
  isLoading = false;
  searchText = '';

  constructor(
    private userService: UserManagementService,
    private authService: AuthService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadRoles(): void {
    this.roleService.getAllRoles().subscribe({
      next: (data) => this.availableRoles = data,
      error: (err) => console.error('Error loading roles', err)
    });
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

  assignRole(userId: string, roleName: string): void {
    if (!roleName) {
      alert('Veuillez sélectionner un rôle.');
      return;
    }
    if (confirm(`Voulez-vous attribuer le rôle ${roleName} à cet utilisateur ?`)) {
      this.userService.assignRole(userId, roleName).subscribe({
        next: () => {
          alert(`Rôle ${roleName} attribué avec succès !`);
          this.loadUsers();
        },
        error: (err: any) => {
          console.error('Error assigning role', err);
          alert('Erreur lors de l\'attribution du rôle: ' + (err.error?.message || err.message));
        }
      });
    }
  }
}
