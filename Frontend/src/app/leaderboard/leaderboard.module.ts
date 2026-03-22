import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaderboardRoutingModule } from './leaderboard-routing.module';
import { SharedModule } from '../shared/shared.module';
import { LeaderboardComponent } from './leaderboard/leaderboard.component';

@NgModule({
  declarations: [LeaderboardComponent],
  imports: [
    CommonModule,
    FormsModule,
    LeaderboardRoutingModule,
    SharedModule
  ]
})
export class LeaderboardModule { }

