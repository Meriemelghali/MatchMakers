import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from 'src/app/core/services/auth.service';
import { NgForm } from '@angular/forms'; 

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loading = false;
  errorMessage = '';

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
        this.authService.saveTokens(res);
        this.router.navigate(['/events']); 
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Erreur de connexion'; 
      },
      complete: () => this.loading = false
    });
  
  }


}


