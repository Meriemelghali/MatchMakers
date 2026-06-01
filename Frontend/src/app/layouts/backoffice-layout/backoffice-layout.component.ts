import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ThemeService, ThemeType } from '../../core/services/ThemeService/theme.service';

interface NavChild {
  path: string;
  label: string;
}

interface NavGroup {
  label: string;
  icon: string;
  expanded: boolean;
  direct?: string;       // si lien direct (pas de sous-menu)
  children?: NavChild[];
}

@Component({
  selector: 'app-backoffice-layout',
  templateUrl: './backoffice-layout.component.html',
  styleUrls: ['./backoffice-layout.component.css']
})
export class BackofficeLayoutComponent implements OnInit, OnDestroy {
  navOpen = false;
  userName = 'Admin';
  dropdownOpen = false;
  themeListExpanded = false;
  currentTheme: ThemeType = 'DARK';
  private themeSub!: Subscription;

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) { }

  ngOnInit() {
    const firstName = localStorage.getItem('firstName') || '';
    const lastName = localStorage.getItem('lastName') || '';
    if (firstName || lastName) {
      this.userName = `${firstName} ${lastName}`.trim();
    }

    this.themeSub = this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  ngOnDestroy() {
    if (this.themeSub) {
      this.themeSub.unsubscribe();
    }
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
    if (!this.dropdownOpen) {
      this.themeListExpanded = false;
    }
  }

  toggleThemeList(event: Event) {
    event.stopPropagation();
    this.themeListExpanded = !this.themeListExpanded;
  }

  closeDropdown() {
    this.dropdownOpen = false;
    this.themeListExpanded = false;
  }

  changeTheme(theme: ThemeType) {
    this.themeService.setTheme(theme);
  }

  getThemeLabel(theme: ThemeType): string {
    switch (theme) {
      case 'SYSTEM': return 'Système';
      case 'LIGHT': return 'Clair';
      case 'DARK': return 'Sombre';
      case 'LIGHT_HIGH_CONTRAST': return 'Clair (Contraste Élevé)';
      case 'DARK_HIGH_CONTRAST': return 'Sombre (Contraste Élevé)';
      default: return theme;
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeDropdown();
  }

  navGroups: NavGroup[] = [
    {
      label: 'Tableau de bord',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
      expanded: false,
      direct: '/backoffice/dashboard'
    },
    {
      label: 'Utilisateurs',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      expanded: false,
      children: [
        { path: '/backoffice/users', label: 'Tous les utilisateurs' },
        { path: '/backoffice/roles', label: 'Rôles' }
      ]
    },
    {
      label: 'Boutique',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
      expanded: false,
      children: [
        { path: '/backoffice/products', label: 'Produits' },
        { path: '/backoffice/commande', label: 'Commandes' }
      ]
    },
    {
      label: 'Événements & Sports',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      expanded: false,
      children: [
        { path: '/backoffice/event-types', label: "Types d'événements" },
        { path: '/backoffice/sports', label: 'Sports' }
      ]
    },
    {
      label: 'Sponsors',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      expanded: false,
      children: [
        { path: '/backoffice/sponsors', label: 'Sponsors' },
        { path: '/backoffice/Campaigns', label: 'Campagnes' }
      ]
    },
    {
      label: 'Réclamations',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      expanded: false,
      direct: '/backoffice/reclamations'
    }
  ];

  toggle(group: NavGroup) {
    if (group.direct) {
      this.router.navigate([group.direct]);
      return;
    }
    group.expanded = !group.expanded;
  }

  isGroupActive(group: NavGroup): boolean {
    if (group.direct) {
      return this.router.url === group.direct || this.router.url.startsWith(group.direct);
    }
    return group.children?.some(c => this.router.url.startsWith(c.path)) ?? false;
  }

  goToApp(): void {
    this.router.navigate(['/admin-choice']);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
