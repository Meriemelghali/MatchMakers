import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-role-selection',
  templateUrl: './role-selection.component.html',
  styleUrls: ['./role-selection.component.css']
})
export class RoleSelectionComponent implements OnInit {
  availableRoles: string[] = [];

  constructor(public router: Router) { }

  ngOnInit(): void {
    const rolesJson = localStorage.getItem('availableRoles');
    if (rolesJson) {
      this.availableRoles = JSON.parse(rolesJson);
    } else {
      this.router.navigate(['/login']);
    }
  }

  selectRole(role: string): void {
    localStorage.setItem('userRole', role);
    
    // Redirection basée sur le rôle choisi
    if (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'ROLE_ADMIN') {
      this.router.navigate(['/admin-choice']);
    } else {
      this.router.navigate(['/events']);
    }
  }

  getRoleIcon(role: string): string {
    const r = role.toUpperCase();
    if (r.includes('ADMIN')) return 'fa-user-shield';
    if (r.indexOf('SPORTIF') !== -1 || r.indexOf('USER') !== -1) return 'fa-running';
    if (r.indexOf('ORGANIZER') !== -1) return 'fa-calendar-check';
    if (r.indexOf('SPONSOR') !== -1) return 'fa-handshake';
    return 'fa-user';
  }

  getRoleTitle(role: string): string {
    const r = role.toUpperCase();
    if (r.includes('ADMIN')) return 'Administrateur';
    if (r.indexOf('SPORTIF') !== -1 || r.indexOf('USER') !== -1) return 'Sportif';
    if (r.indexOf('ORGANIZER') !== -1) return 'Organisateur';
    if (r.indexOf('SPONSOR') !== -1) return 'Sponsor';
    return role;
  }
}
