import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RewardsRoutingModule } from './rewards-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { RewardsListComponent } from './rewards-list/rewards-list.component';
import { CreateRewardComponent } from './create-reward/create-reward.component';
import { RewardDetailsComponent } from './reward-details/reward-details.component';

@NgModule({
  declarations: [
    RewardsListComponent,
    CreateRewardComponent,
    RewardDetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RewardsRoutingModule,
    SharedModule
  ]
})
export class RewardsModule { }

