import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  template: `
    <div class="stars" [class.interactive]="interactive">
      <span *ngFor="let s of [1,2,3,4,5]"
            class="star"
            [class.filled]="s <= (hovered || value)"
            (mouseenter)="interactive && (hovered = s)"
            (mouseleave)="interactive && (hovered = 0)"
            (click)="interactive && select(s)">
        ★
      </span>
      <span *ngIf="showCount && count > 0"
            class="star-count">({{ count }})</span>
    </div>
  `,
  styles: [`
    .stars { display:inline-flex; align-items:center; gap:2px; }
    .star  { font-size:18px; color:#ddd; transition:color 100ms; }
    .star.filled { color:#F59E0B; }
    .interactive .star { cursor:pointer; }
    .interactive .star:hover { transform:scale(1.15); }
    .star-count { font-size:12px; color:var(--color-text-tertiary); margin-left:4px; }
  `]
})
export class StarRatingComponent {
  @Input()  value       = 0;
  @Input()  interactive = false;
  @Input()  showCount   = false;
  @Input()  count       = 0;
  @Output() rated       = new EventEmitter<number>();
  hovered = 0;
  select(s: number) { this.value = s; this.rated.emit(s); }
}