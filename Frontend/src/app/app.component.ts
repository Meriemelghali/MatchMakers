import { Component } from '@angular/core';

import { ThemeService } from './core/services/ThemeService/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private themeService: ThemeService) {}
}
