import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackofficeRoutingModule } from './backoffice-routing.module';
import { UserListComponent } from './user-list/user-list.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EventTypeManagementComponent } from './event-type-management/event-type-management.component';
import { RoleListComponent } from './roles/role-list/role-list.component';
import { RoleFormComponent } from './roles/role-form/role-form.component';
import { SportListComponent } from './sports/sport-list/sport-list.component';
import { SportFormComponent } from './sports/sport-form/sport-form.component';
import { AdminReclamationsComponent } from './reclamations/admin-reclamations.component';

@NgModule({
  declarations: [
    UserListComponent,
    DashboardComponent,
    EventTypeManagementComponent,
    RoleListComponent,
    RoleFormComponent,
    SportListComponent,
    SportFormComponent,
    AdminReclamationsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BackofficeRoutingModule
  ]
})
export class BackofficeModule { }
