import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackofficeRoutingModule } from './backoffice-routing.module';
import { UserListComponent } from './user-list/user-list.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EventTypeManagementComponent } from './event-type-management/event-type-management.component';

@NgModule({
  declarations: [
    UserListComponent,
    DashboardComponent,
    EventTypeManagementComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BackofficeRoutingModule
  ]
})
export class BackofficeModule { }
