import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ReservationsRoutingModule } from './reservations-routing.module';

import { ReservationsListComponent } from './reservations-list/reservations-list.component';
import { ReservationFormComponent } from './reservation-form/reservation-form.component';
import { SelectionEvaluatorComponent } from './selection-evaluator/selection-evaluator.component';
import { SmartCalendarComponent } from './smart-calendar/smart-calendar.component';

@NgModule({
  declarations: [
    ReservationsListComponent,
    ReservationFormComponent,
    SelectionEvaluatorComponent,
    SmartCalendarComponent,
  ],
  imports: [
    CommonModule,
    ReservationsRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class ReservationsModule { }

