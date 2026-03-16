import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TerrainListComponent } from './terrain-list/terrain-list.component';
import { TerrainFormComponent } from './terrain-form/terrain-form.component';
import { TerrainDetailComponent } from './terrain-detail/terrain-detail.component';
import { ReservationsListComponent } from './reservations-list/reservations-list.component';

const routes: Routes = [
    
    { path: '', component: TerrainListComponent },
    { path: 'reservations', component: ReservationsListComponent },
    { path: 'new', component: TerrainFormComponent },
    { path: ':id/edit', component: TerrainFormComponent },
    { path: ':id', component: TerrainDetailComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class TerrainsRoutingModule { }
