import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/core/services/AuthService/auth.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  loading = false;
  successMessage = '';
  errorMessage = '';
  token: string | null = null;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(form: NgForm) {
    if (form.invalid) return;

    if (form.value.password !== form.value.confirmPassword) {
      this.errorMessage = "Les mots de passe ne correspondent pas.";
      return;
    }

    if (!this.token) {
      this.errorMessage = "Lien de réinitialisation invalide ou expiré.";
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.authService.resetPassword(this.token, form.value.password).subscribe({
      next: () => {
        this.successMessage = 'Votre mot de passe a été réinitialisé avec succès. Redirection...';
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Erreur lors de la réinitialisation. Veuillez réessayer.';
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }
}
