import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/AuthService/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true; // utilisateur connecté → accès autorisé
  } else {
    router.navigate(['/login']); // pas connecté → redirige vers login
    return false; // bloque la route
  }
};