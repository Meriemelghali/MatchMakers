import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-choice',
  templateUrl: './admin-choice.component.html',
  styleUrls: ['./admin-choice.component.css']
})
export class AdminChoiceComponent {

  constructor(private router: Router) {}

  goToApp() {
    this.router.navigate(['/events']);
  }

  goToBackoffice() {
    this.router.navigate(['/backoffice']);
  }
}
