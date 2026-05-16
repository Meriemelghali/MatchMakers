import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeType = 'LIGHT' | 'DARK' | 'SYSTEM';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'matchmakers_theme';
  private currentThemeSubject = new BehaviorSubject<ThemeType>('DARK');
  public currentTheme$ = this.currentThemeSubject.asObservable();

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeType;
    if (savedTheme) {
      this.setTheme(savedTheme, false);
    } else {
      // Default to DARK or SYSTEM
      this.setTheme('DARK', false);
    }
  }

  public setTheme(theme: ThemeType, saveLocal: boolean = true): void {
    if (saveLocal) {
      localStorage.setItem(this.THEME_KEY, theme);
    }
    
    this.currentThemeSubject.next(theme);
    
    // Apply to standard doc root
    if (theme === 'LIGHT') {
      document.documentElement.setAttribute('data-theme', 'LIGHT');
    } else if (theme === 'DARK') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      // System logic can be added here if needed, for now default to dark
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.documentElement.setAttribute('data-theme', 'LIGHT');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }

  public getCurrentTheme(): ThemeType {
    return this.currentThemeSubject.value;
  }
}
