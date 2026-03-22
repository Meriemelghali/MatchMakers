import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-pagination',
    template: `
    <div class="pagination" *ngIf="totalPages > 1">
      <button class="btn btn-ghost btn-sm" [disabled]="page === 1" (click)="change(page - 1)">
        ← Précédent
      </button>
      <span class="page-info">Page {{ page }} / {{ totalPages }}</span>
      <button class="btn btn-ghost btn-sm" [disabled]="page === totalPages" (click)="change(page + 1)">
        Suivant →
      </button>
    </div>
  `,
    styles: [`
    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 16px 0; }
    .page-info { font-size: 0.875rem; color: var(--text-secondary); }
  `]
})
export class PaginationComponent {
    @Input() page = 1;
    @Input() totalPages = 1;
    @Output() pageChange = new EventEmitter<number>();
    change(p: number) { this.pageChange.emit(p); }
}
