import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatchesRoutingModule } from './matches-routing.module';
import { SharedModule } from '../shared/shared.module';
import { MatchListComponent } from './match-list/match-list.component';
import { MatchFormComponent } from './match-form/match-form.component';
import { MatchDetailComponent } from './match-detail/match-detail.component';
import { StadiumReactionComponent } from './stadium-reaction/stadium-reaction.component';

@NgModule({
    declarations: [MatchListComponent, MatchFormComponent, MatchDetailComponent, StadiumReactionComponent],
    imports: [CommonModule, MatchesRoutingModule, ReactiveFormsModule, FormsModule, SharedModule]
})
export class MatchesModule { }
