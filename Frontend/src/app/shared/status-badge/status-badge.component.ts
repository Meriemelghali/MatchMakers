import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-status-badge',
    template: `<span class="badge" [class]="badgeClass">{{ label }}</span>`,
    styles: []
})
export class StatusBadgeComponent {
    @Input() status = '';

    get badgeClass() { return `badge-${this.status.toLowerCase()}`; }
    get label() { return this.status.replace('_', ' '); }
}
