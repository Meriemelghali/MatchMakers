import { Component, OnInit } from '@angular/core';
import { RoleService } from '../../../../core/services/role.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { Role, Permission } from '../../../../core/models/role.model';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-role-form',
  templateUrl: './role-form.component.html',
  styleUrls: ['./role-form.component.css']
})
export class RoleFormComponent implements OnInit {
  role: Role = {
    name: '',
    description: '',
    permissions: []
  };
  
  availablePermissions: Permission[] = [];
  selectedPermissionIds: Set<string> = new Set();
  
  isEditMode: boolean = false;
  isLoading: boolean = false;
  isSaving: boolean = false;
  formSubmitted: boolean = false;

  constructor(
    private roleService: RoleService,
    private permissionService: PermissionService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.loadRole(id);
    }
    this.loadPermissions();
  }

  loadRole(id: string): void {
    this.isLoading = true;
    this.roleService.getRoleById(id).subscribe({
      next: (data) => {
        this.role = data;
        this.selectedPermissionIds = new Set(data.permissions.map(p => p.id!));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading role:', err);
        this.isLoading = false;
        this.router.navigate(['/backoffice/roles']);
      }
    });
  }

  loadPermissions(): void {
    this.permissionService.getAllPermissions().subscribe({
      next: (data) => {
        this.availablePermissions = data;
      },
      error: (err) => {
        console.error('Error loading permissions:', err);
      }
    });
  }

  togglePermission(id: string): void {
    if (this.selectedPermissionIds.has(id)) {
      this.selectedPermissionIds.delete(id);
    } else {
      this.selectedPermissionIds.add(id);
    }
  }

  isPermissionSelected(id: string): boolean {
    return this.selectedPermissionIds.has(id);
  }

  saveRole(): void {
    this.formSubmitted = true;
    if (!this.role.name || !this.role.description) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    this.isSaving = true;
    const permissionIds = Array.from(this.selectedPermissionIds);

    if (this.isEditMode) {
      this.roleService.updateRole(this.role.id!, this.role.name, this.role.description).subscribe({
        next: (updatedRole) => {
          this.roleService.setPermissionsForRole(updatedRole.id!, permissionIds).subscribe({
            next: () => {
              this.isSaving = false;
              this.router.navigate(['/backoffice/roles']);
            },
            error: (err) => {
              console.error('Error setting permissions:', err);
              this.isSaving = false;
            }
          });
        },
        error: (err) => {
          console.error('Error updating role:', err);
          this.isSaving = false;
        }
      });
    } else {
      this.roleService.createRole(this.role.name, this.role.description).subscribe({
        next: (newRole) => {
          this.roleService.setPermissionsForRole(newRole.id!, permissionIds).subscribe({
            next: () => {
              this.isSaving = false;
              this.router.navigate(['/backoffice/roles']);
            },
            error: (err) => {
              console.error('Error setting permissions:', err);
              this.isSaving = false;
            }
          });
        },
        error: (err) => {
          console.error('Error creating role:', err);
          this.isSaving = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/backoffice/roles']);
  }
}
