import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-backoffice-layout',
  templateUrl: './backoffice-layout.component.html',
  styleUrls: ['./backoffice-layout.component.css']
})
export class BackofficeLayoutComponent {

  constructor(private router: Router) {}

  goToApp(): void {
    this.router.navigate(['/admin-choice']);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
