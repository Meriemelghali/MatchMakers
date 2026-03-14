import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatchListComponent } from './match-list/match-list.component';
import { MatchFormComponent } from './match-form/match-form.component';
import { MatchDetailComponent } from './match-detail/match-detail.component';

const routes: Routes = [
    { path: '', component: MatchListComponent },
    { path: 'new', component: MatchFormComponent },
    { path: ':id/edit', component: MatchFormComponent },
    { path: ':id', component: MatchDetailComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MatchesRoutingModule { }
