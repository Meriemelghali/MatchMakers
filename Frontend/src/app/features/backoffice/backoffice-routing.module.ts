import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserListComponent } from './user-list/user-list.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EventTypeManagementComponent } from './event-type-management/event-type-management.component';
import { RoleListComponent } from './roles/role-list/role-list.component';
import { RoleFormComponent } from './roles/role-form/role-form.component';
import { SportListComponent } from './sports/sport-list/sport-list.component';
import { SportFormComponent } from './sports/sport-form/sport-form.component';
import { AdminReclamationsComponent } from './reclamations/admin-reclamations.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'users', component: UserListComponent },
  { path: 'event-types', component: EventTypeManagementComponent },
  { path: 'roles', component: RoleListComponent },
  { path: 'roles/add', component: RoleFormComponent },
  { path: 'roles/edit/:id', component: RoleFormComponent },
  { path: 'sports', component: SportListComponent },
  { path: 'sports/add', component: SportFormComponent },
  { path: 'sports/edit/:id', component: SportFormComponent },
  { path: 'reclamations', component: AdminReclamationsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BackofficeRoutingModule { }
