import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReclamationFormComponent } from './reclamation-form/reclamation-form.component';

const routes: Routes = [
  { path: 'new', component: ReclamationFormComponent },
  { path: '', redirectTo: 'new', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReclamationsRoutingModule { }
