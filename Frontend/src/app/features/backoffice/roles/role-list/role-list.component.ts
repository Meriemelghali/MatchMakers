import { Component, OnInit } from '@angular/core';
import { RoleService } from '../../../../core/services/role.service';
import { Role } from '../../../../core/models/role.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-role-list',
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.css']
})
export class RoleListComponent implements OnInit {
  roles: Role[] = [];
  filteredRoles: Role[] = [];
  searchText: string = '';
  isLoading: boolean = false;

  constructor(
    private roleService: RoleService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading = true;
    this.roleService.getAllRoles().subscribe({
      next: (data) => {
        this.roles = data;
        this.filteredRoles = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading roles:', err);
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    const search = this.searchText.toLowerCase().trim();
    if (!search) {
      this.filteredRoles = this.roles;
      return;
    }
    this.filteredRoles = this.roles.filter(role => 
      role.name.toLowerCase().includes(search) || 
      role.description.toLowerCase().includes(search)
    );
  }

  addRole(): void {
    this.router.navigate(['/backoffice/roles/add']);
  }

  editRole(id: string): void {
    this.router.navigate(['/backoffice/roles/edit', id]);
  }

  deleteRole(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      this.roleService.deleteRole(id).subscribe({
        next: () => {
          this.loadRoles();
        },
        error: (err) => {
          console.error('Error deleting role:', err);
          alert('Erreur lors de la suppression du rôle.');
        }
      });
    }
  }
}
