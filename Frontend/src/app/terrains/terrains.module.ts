import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TerrainsRoutingModule } from './terrains-routing.module';
import { SharedModule } from '../shared/shared.module';
import { TerrainListComponent } from './terrain-list/terrain-list.component';
import { TerrainFormComponent } from './terrain-form/terrain-form.component';
import { TerrainDetailComponent } from './terrain-detail/terrain-detail.component';
import { ReservationsListComponent } from './reservations-list/reservations-list.component';

@NgModule({
    declarations: [TerrainListComponent, TerrainFormComponent, TerrainDetailComponent, ReservationsListComponent],
    imports: [CommonModule, TerrainsRoutingModule, ReactiveFormsModule, FormsModule, SharedModule]
})
export class TerrainsModule { }
