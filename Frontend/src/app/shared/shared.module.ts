import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaginationComponent } from './pagination/pagination.component';
import { StatusBadgeComponent } from './status-badge/status-badge.component';

@NgModule({
    declarations: [PaginationComponent, StatusBadgeComponent],
    imports: [CommonModule, RouterModule],
    exports: [PaginationComponent, StatusBadgeComponent]
})
export class SharedModule { }
