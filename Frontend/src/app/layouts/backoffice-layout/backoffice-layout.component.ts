import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-backoffice-layout',
  templateUrl: './backoffice-layout.component.html',
  styleUrls: ['./backoffice-layout.component.css']
})
export class BackofficeLayoutComponent {
  navOpen = false;
  userName = 'Admin';

  constructor(private router: Router) {}

  ngOnInit() {
    const firstName = localStorage.getItem('firstName') || '';
    const lastName = localStorage.getItem('lastName') || '';
    if (firstName || lastName) {
      this.userName = `${firstName} ${lastName}`.trim();
    }
  }

  navLinksBackoffice = [
    {
      path: '/backoffice/dashboard',
      label: 'Tableau de bord',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
    },
    {
      path: '/backoffice/users',
      label: 'Utilisateurs',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
    },
  ];
  goToApp(): void {
    this.router.navigate(['/admin-choice']);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
