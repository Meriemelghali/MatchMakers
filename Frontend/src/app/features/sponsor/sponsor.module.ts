import { NgModule }            from '@angular/core';
import { CommonModule }        from '@angular/common';        // ← ngClass, ngIf, date, slice
import { FormsModule }         from '@angular/forms';         // ← ngModel
import { ReactiveFormsModule } from '@angular/forms';         // ← formGroup
import { HttpClientModule }    from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SponsorsRoutingModule } from './sponsors-routing.module';

import { SponsorProfileComponent } from './sponsor-profile/sponsor-profile.component';
import { SponsorAdminComponent }   from './components/sponsor-admin/sponsor-admin.component';
import { CampaignFormComponent } from './campaign-form/campaign-form.component';
import { CampaignListComponent } from './campaign-list/campaign-list.component';
import { CampaignListSponsorComponent } from './campaign-list-sponsor/campaign-list-sponsor.component';
import { SponsorBannerComponent }  from './sponsor-banner/sponsor-banner.component';

@NgModule({
  declarations: [
    SponsorProfileComponent,
    SponsorAdminComponent,
    CampaignFormComponent,
    CampaignListComponent,
    CampaignListSponsorComponent,

    SponsorBannerComponent
  ],
  imports: [
    CommonModule,        // ngClass, ngIf, ngFor, date, slice
    ReactiveFormsModule, // formGroup, formControlName
    FormsModule,         // ngModel
    SponsorsRoutingModule
  ],
  exports: [
    SponsorProfileComponent,
    SponsorAdminComponent,
    SponsorBannerComponent  // exporté pour utilisation ailleurs
  ]
})
export class SponsorModule { }