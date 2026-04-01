import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RewardsListComponent } from './rewards-list/rewards-list.component';
import { CreateRewardComponent } from './create-reward/create-reward.component';
import { RewardDetailsComponent } from './reward-details/reward-details.component';

const routes: Routes = [
  { path: '', component: RewardsListComponent },
  { path: 'create', component: CreateRewardComponent },
  { path: ':id', component: RewardDetailsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RewardsRoutingModule { }

