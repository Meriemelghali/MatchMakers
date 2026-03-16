import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { LoginComponent } from './features/Auth/login/login.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { authGuard } from './core/guards/auth.guard';  

const routes: Routes = [
  //par défaut 
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
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
        path: 'matches',
        loadChildren: () =>
          import('./matches/matches.module').then(m => m.MatchesModule)
      },
      {
        path: 'terrains',
        loadChildren: () =>
          import('./terrains/terrains.module').then(m => m.TerrainsModule)
      },
      // autres routes privées ici
    ]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
