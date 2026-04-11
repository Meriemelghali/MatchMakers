import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { LoginComponent } from './core/Auth/login/login.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { authGuard } from './core/guards/auth.guard';  
import { RegisterComponent } from './core/Auth/register/register.component';
import { ForgotPasswordComponent } from './core/Auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './core/Auth/reset-password/reset-password.component';
import { AdminChoiceComponent } from './core/Auth/admin-choice/admin-choice.component';
import { BackofficeLayoutComponent } from './layouts/backoffice-layout/backoffice-layout.component';
import { RoleSelectionComponent } from './core/Auth/role-selection/role-selection.component';
import { ProfileComponent } from './features/profile/profile.component';


const routes: Routes = [
  //par défaut 
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'role-selection', component: RoleSelectionComponent, canActivate: [authGuard] },
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: 'reset-password', component: ResetPasswordComponent },
      // autres pages publiques
    ]
  },
  {
    path: '',
    component: AuthLayoutComponent,
    canActivate: [authGuard], // protège toutes les routes ici
    children: [
      {
        path: 'events',
        loadChildren: () => import('./features/events/events.module').then(m => m.EventsModule)
      },
      {
        path: 'social',
        loadChildren: () => import('./features/social/social.module').then(m => m.SocialModule)
      },
      {
        path: 'reservations',
        loadChildren: () => import('./features/reservations/reservations.module').then(m => m.ReservationsModule)
      },
      {
        path: 'matches',
        loadChildren: () =>
          import('./matches/matches.module').then(m => m.MatchesModule)
      },
      {
        path: 'terrains',
        loadChildren: () =>
          import('./terrains/terrains.module').then(m => m.TerrainsModule)
      },
      {
        path: 'teams',
        loadChildren: () => import('./features/teams/teams.module').then(m => m.TeamsModule)
      },
      {
        path: 'rewards',
        loadChildren: () => import('./features/rewards/rewards.module').then(m => m.RewardsModule)
      },
      {
        path: 'leaderboard',
        loadChildren: () => import('./features/leaderboard/leaderboard.module').then(m => m.LeaderboardModule)
      },
      {
        path: 'profile',
        component: ProfileComponent
      },
      // autres routes privées ici
    ]
  },
  // Route "pure" pour le choix d'administration (gardée par authGuard)
  {
    path: 'admin-choice',
    component: AdminChoiceComponent,
    canActivate: [authGuard]
  },
  // Layout Backoffice
  {
    path: 'backoffice',
    component: BackofficeLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./features/backoffice/backoffice.module').then(m => m.BackofficeModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
