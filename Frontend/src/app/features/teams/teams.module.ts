import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TeamsRoutingModule } from './teams-routing.module';
import { SharedModule } from '../shared/shared.module';
import { TeamsListComponent } from './teams-list/teams-list.component';
import { CreateTeamComponent } from './create-team/create-team.component';
import { TeamDetailsComponent } from './team-details/team-details.component';
import { TeamReportComponent } from './team_report/team_report.component';

@NgModule({
  declarations: [
    TeamsListComponent,
    CreateTeamComponent,
    TeamDetailsComponent,
    TeamReportComponent
  ],
  imports: [
    CommonModule,
    TeamsRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule
  ]
})
export class TeamsModule { }

