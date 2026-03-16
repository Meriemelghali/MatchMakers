import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  loading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  togglePassword(): void { this.showPassword = !this.showPassword; }
  toggleConfirmPassword(): void { this.showConfirmPassword = !this.showConfirmPassword; }

  onRegister(form: NgForm): void {
    if (form.invalid) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    const { password, confirmPassword } = form.value;
    if (password !== confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const payload = {
      firstName:       form.value.firstName,
      lastName:        form.value.lastName,
      username:        form.value.username,
      email:           form.value.email,
      password:        form.value.password,
      confirmPassword: form.value.confirmPassword,
      phoneNumber:     form.value.phoneNumber,
      sex:             form.value.sex
    };
    console.log('Payload envoyé:', payload);
    this.authService.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        if (err.error?.error) {
          this.errorMessage = err.error.error;  // ← prend le message exact du backend
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Une erreur est survenue. Réessayez.';
        }
      }
    });
  }
}