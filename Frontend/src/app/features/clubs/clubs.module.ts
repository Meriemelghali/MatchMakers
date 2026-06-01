import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { ClubsRoutingModule } from './clubs-routing.module';
import { ClubListComponent } from './club-list/club-list.component';
import { ClubFormComponent } from './club-form/club-form.component';
import { ClubDetailComponent } from './club-detail/club-detail.component';


@NgModule({
  declarations: [
    ClubListComponent,
    ClubFormComponent,
    ClubDetailComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ClubsRoutingModule
  ]
})
export class ClubsModule { }
