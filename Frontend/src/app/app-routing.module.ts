import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'events',
    loadChildren: () => import('./events/events.module').then(m => m.EventsModule)
  },
  {
    path: 'matches',
    loadChildren: () => import('./matches/matches.module').then(m => m.MatchesModule)
  },
  {
    path: 'terrains',
    loadChildren: () => import('./terrains/terrains.module').then(m => m.TerrainsModule)
  },
  { path: '', redirectTo: 'matches', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
