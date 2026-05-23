import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RewardsListComponent } from './rewards-list/rewards-list.component';
import { CreateRewardComponent } from './create-reward/create-reward.component';
import { RewardDetailsComponent } from './reward-details/reward-details.component';
import { RewardsAiGeneratorComponent } from './ai-generator/rewards-ai-generator.component';
import { RewardDesignerComponent } from './reward-designer/reward-designer.component';

const routes: Routes = [
  { path: '', component: RewardsListComponent },
  { path: 'ai-generator', component: RewardsAiGeneratorComponent },
  { path: 'create', component: CreateRewardComponent },
  { path: ':id/designer', component: RewardDesignerComponent },
  { path: ':id', component: RewardDetailsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RewardsRoutingModule { }

