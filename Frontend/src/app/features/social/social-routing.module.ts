import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SocialListComponent } from './social-list/social-list.component';
import { SocialFormComponent } from './social-form/social-form.component';
import { SocialChatComponent } from './social-chat/social-chat.component';

const routes: Routes = [
  { path: '', component: SocialListComponent },
  { path: 'expand', component: SocialListComponent },
  { path: 'discussions', component: SocialChatComponent },
  { path: 'create', component: SocialFormComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SocialRoutingModule { }
