import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SocialRoutingModule } from './social-routing.module';


import { SocialListComponent } from './social-list/social-list.component';
import { SocialFormComponent } from './social-form/social-form.component';

@NgModule({
  declarations: [
    SocialListComponent,
    SocialFormComponent
  ],
  imports: [
    CommonModule,
    SocialRoutingModule,
    FormsModule
  ]
})
export class SocialModule { }
