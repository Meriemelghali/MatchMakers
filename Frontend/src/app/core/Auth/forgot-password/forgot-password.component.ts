import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/AuthService/auth.service';
import { NgForm } from '@angular/forms'; 

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(form: NgForm) {
    if (form.invalid) return;
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.authService.forgotPassword(form.value.email).subscribe({
      next: () => {
        this.successMessage = 'Un e-mail de demande de réinitialisation a été envoyé à cette adresse.';
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Erreur lors de la demande. Veuillez réessayer.';
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }
}
