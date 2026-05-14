import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SponsorProfileComponent } from './sponsor-profile/sponsor-profile.component';
import { CampaignListSponsorComponent }   from './campaign-list-sponsor/campaign-list-sponsor.component';
import { CampaignFormComponent }   from './campaign-form/campaign-form.component';

const routes: Routes = [
  { path: 'profile',          component: SponsorProfileComponent },
  { path: 'campaigns',        component: CampaignListSponsorComponent   },
  { path: 'campaigns/new',    component: CampaignFormComponent   },
  { path: 'campaigns/edit/:id', component: CampaignFormComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SponsorsRoutingModule {}