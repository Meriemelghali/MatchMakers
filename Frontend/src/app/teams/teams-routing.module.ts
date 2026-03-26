import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TeamsListComponent } from './teams-list/teams-list.component';
import { CreateTeamComponent } from './create-team/create-team.component';
import { TeamDetailsComponent } from './team-details/team-details.component';
import { TeamReportComponent } from './team_report/team_report.component';

const routes: Routes = [
  { path: '', component: TeamsListComponent },
  { path: 'create', component: CreateTeamComponent },
  { path: ':id/report', component: TeamReportComponent },
  { path: ':id', component: TeamDetailsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TeamsRoutingModule { }

