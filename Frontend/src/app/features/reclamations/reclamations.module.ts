import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ReclamationsRoutingModule } from './reclamations-routing.module';
import { ReclamationFormComponent } from './reclamation-form/reclamation-form.component';

@NgModule({
  declarations: [ReclamationFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ReclamationsRoutingModule
  ]
})
export class ReclamationsModule { }
