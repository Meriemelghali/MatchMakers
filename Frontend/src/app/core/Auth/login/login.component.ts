import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from 'src/app/core/services/AuthService/auth.service';
import { NgForm } from '@angular/forms'; 

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loading = false;
  errorMessage = '';
  showPassword = false;

  // MFA states
  isMfaChoiceStep = false;
  isMfaVerifyStep = false;
  
  email = '';
  password = '';
  mfaCode = '';
  twoFactorType = '';
  qrCodeImage = '';

  constructor(private authService: AuthService, private router: Router) { }

  onLogin(form: NgForm) {
    if (form.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const request: LoginRequest = {
      email: form.value.email,
      password: form.value.password
    };

    this.authService.login(request).subscribe({
      next: (res) => {
        console.log('DEBUG 2FA - Response received:', res);
        // Le backend renvoie systématiquement requiresMfaChoice si le mdp est bon
        if (res.requiresMfaChoice) {
          this.email = request.email;
          this.password = request.password;
          this.isMfaChoiceStep = true;
          this.loading = false;
          return;
        }
        
        // Cas nominal (si le 2FA était désactivé par erreur)
        this.authService.saveTokensAndRedirect(res, this.router);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || err.error?.error || 'Erreur de connexion'; 
      },
      complete: () => this.loading = false
    });
  }

  selectMfaMethod(method: 'EMAIL' | 'AUTH_APP') {
    this.loading = true;
    this.errorMessage = '';
    this.twoFactorType = method;

    this.authService.setup2Fa({ 
      email: this.email, 
      password: this.password, 
      type: method 
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.isMfaChoiceStep = false;
        this.isMfaVerifyStep = true;
        this.qrCodeImage = res.qrCodeImageBase64 || '';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur d\'initialisation du mode de validation';
      }
    });
  }

  onVerifyMfa() {
    if (!this.mfaCode) return;
    this.loading = true;

    this.authService.verify2Fa({
      email: this.email,
      password: this.password,
      code: this.mfaCode
    }).subscribe({
      next: (res) => {
        this.authService.saveTokensAndRedirect(res, this.router);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Code invalide';
      }
    });
  }

  backToChoice() {
    this.isMfaVerifyStep = false;
    this.isMfaChoiceStep = true;
    this.mfaCode = '';
    this.qrCodeImage = '';
  }

  backToLogin() {
    this.isMfaChoiceStep = false;
    this.isMfaVerifyStep = false;
    this.errorMessage = '';
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}


