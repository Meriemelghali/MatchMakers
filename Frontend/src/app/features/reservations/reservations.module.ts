import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ReservationsRoutingModule } from './reservations-routing.module';


import { ReservationsListComponent } from './reservations-list/reservations-list.component';
import { ReservationFormComponent } from './reservation-form/reservation-form.component';
import { RecommendationListComponent } from './recommendation-list/recommendation-list.component';
import { SelectionEvaluatorComponent } from './selection-evaluator/selection-evaluator.component';

@NgModule({
  declarations: [
    ReservationsListComponent,
    ReservationFormComponent,
    RecommendationListComponent,
    SelectionEvaluatorComponent
  ],
  imports: [
    CommonModule,
    ReservationsRoutingModule,
    FormsModule
  ]
})
export class ReservationsModule { }
