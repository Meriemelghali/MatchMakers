import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'matches',
    loadChildren: () => import('./matches/matches.module').then(m => m.MatchesModule)
  },
  {
    path: 'terrains',
    loadChildren: () => import('./terrains/terrains.module').then(m => m.TerrainsModule)
  },
  {
    path: 'teams',
    loadChildren: () => import('./teams/teams.module').then(m => m.TeamsModule)
  },
  {
    path: 'rewards',
    loadChildren: () => import('./rewards/rewards.module').then(m => m.RewardsModule)
  },
  {
    path: 'leaderboard',
    loadChildren: () => import('./leaderboard/leaderboard.module').then(m => m.LeaderboardModule)
  },
  { path: '', redirectTo: 'matches', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
