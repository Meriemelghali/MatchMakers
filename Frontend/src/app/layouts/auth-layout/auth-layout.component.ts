// auth-layout.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AIService, SportInspiration } from '../../core/services/UserService/ai.service';
import { AuthService } from '../../core/services/AuthService/auth.service';
import { ThemeService, ThemeType } from '../../core/services/ThemeService/theme.service';

interface NavChild {
  path: string;
  label: string;
  icon: string;
}

interface NavGroup {
  path?: string;
  label: string;
  icon: string;
  expanded?: boolean;
  children?: NavChild[];
}

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.css']
})
export class AuthLayoutComponent implements OnInit, OnDestroy {
  navOpen = false;
  now = new Date();
  private clockInterval: any;
  // ── Profil ──
  profileOpen = false;
  userName = '';
  userRole = '';
  userInitials = '';
  userPhoto = '';

  // ── Rôles multiples ──
  availableRoles: string[] = [];
  roleListExpanded = false;

  // ── Thème ──
  themeListExpanded = false;
  currentTheme: ThemeType = 'DARK';
  private themeSub!: Subscription;

  // AI Inspiration
  sportInspiration?: SportInspiration;
  showInspiration = false;
  isLoadingInspiration = false;

  constructor(
    public router: Router,
    private aiService: AIService,
    private authService: AuthService,
    private themeService: ThemeService
  ) { }

  navGroups: NavGroup[] = [
    {
      label: 'Activité Sportive',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>',
      expanded: false,
      children: [
        {
          path: '/events',
          label: 'Événements',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'
        },
        {
          path: '/matches',
          label: 'Matchs',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>'
        },
        {
          path: '/terrains',
          label: 'Terrains',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2M8 21v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/></svg>'
        },
        {
          path: '/reservations',
          label: 'Réservations',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'
        }
      ]
    },
    {
      label: 'Communauté',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      expanded: false,
      children: [
        {
          path: '/social',
          label: 'Réseau Social',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
        },
        {
          path: '/social/discussions',
          label: 'Messagerie',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>'
        },
        {
          path: '/teams',
          label: 'Équipes',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
        },
        {
          path: '/clubs',
          label: 'Clubs',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
        },
        {
          path: '/reclamations',
          label: 'Réclamations',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        }
      ]
    },
    {
      label: 'Boutique & Performance',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
      expanded: false,
      children: [
        {
          path: '/rewards',
          label: 'Récompenses',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4v4a5 5 0 0 0 10 0V4"/><path d="M5 4h14"/><path d="M7 4V2"/><path d="M17 4V2"/></svg>'
        },
        {
          path: '/leaderboard',
          label: 'Classement',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="4" height="10" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>'
        },
        {
          path: '/products',
          label: 'Boutique',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
        },
        {
          path: '/sponsor/campaigns',
          label: 'Campagnes Sponsor',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
        }
      ]
    },
    {
      path: '/coach',
      label: 'Mon Coach IA',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>'
    }
  ];

  ngOnInit() {
    this.clockInterval = setInterval(() => this.now = new Date(), 30000);
    this.loadUserInfo();
    document.addEventListener('click', () => {
      this.profileOpen = false;
      this.themeListExpanded = false;
    });

    this.themeSub = this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });

    this.checkInspiration();
  }

  checkInspiration() {
    const userId = this.authService.getUserId();
    console.log('AI Inspiration Debug - UserId:', userId);

    if (userId) {
      this.loadInspiration(userId);
    } else {
      console.warn('AI Inspiration - No userId found in localStorage');
    }
  }

  loadInspiration(userId: string) {
    this.isLoadingInspiration = true;
    console.log('AI Inspiration - Calling AI service...');
    this.aiService.getSportInspiration(userId).subscribe({
      next: (data) => {
        console.log('AI Inspiration - Data received:', data);
        this.sportInspiration = data;
        this.showInspiration = true;
        this.isLoadingInspiration = false;

        // Auto-hide after 15 seconds
        setTimeout(() => {
          this.closeInspiration();
        }, 15000);
      },
      error: (err) => {
        console.error('AI Inspiration - Error calling AI service:', err);
        this.isLoadingInspiration = false;
      }
    });
  }

  closeInspiration() {
    this.showInspiration = false;
  }
  ngOnDestroy() {
    clearInterval(this.clockInterval);
    if (this.themeSub) {
      this.themeSub.unsubscribe();
    }
  }
  loadUserInfo(): void {
    const firstName = localStorage.getItem('firstName') || '';
    const lastName = localStorage.getItem('lastName') || '';
    const email = localStorage.getItem('userEmail') || '';

    if (firstName || lastName) {
      this.userName = `${firstName} ${lastName}`.trim();
    } else {
      const raw = email.split('@')[0];
      this.userName = raw.split('.').map((p: string) =>
        p.charAt(0).toUpperCase() + p.slice(1)
      ).join(' ');
    }

    // Initiales
    this.userInitials = this.userName
      .split(' ')
      .map((p: string) => p[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2);

    // Rôle actif
    this.userRole = localStorage.getItem('userRole') || 'SPORTIF';

    // Tous les rôles disponibles
    const rolesJson = localStorage.getItem('availableRoles');
    this.availableRoles = rolesJson ? JSON.parse(rolesJson) : [this.userRole];
  }
  logout(): void {
    localStorage.clear();
    this.profileOpen = false;
    this.router.navigate(['/login']);
  }
  myprofile(): void {
    this.profileOpen = false;
    this.router.navigate(['/profile']);
  }

  get isAdmin(): boolean {
    const role = this.userRole?.toUpperCase() || '';
    return role === 'ADMIN' || role === 'ROLE_ADMIN';
  }

  goToBackoffice(): void {
    this.router.navigate(['/admin-choice']);
  }

  get hasMultipleRoles(): boolean {
    return this.availableRoles.length > 1;
  }

  toggleRoleList(event: Event): void {
    event.stopPropagation();
    this.roleListExpanded = !this.roleListExpanded;
    if (this.roleListExpanded) {
      this.themeListExpanded = false;
    }
  }

  switchRole(role: string): void {
    if (role === this.userRole) {
      this.profileOpen = false;
      this.roleListExpanded = false;
      return;
    }
    localStorage.setItem('userRole', role);
    this.userRole = role;
    this.profileOpen = false;
    this.roleListExpanded = false;

    const r = role.toUpperCase();
    if (r === 'ADMIN' || r === 'ROLE_ADMIN') {
      this.router.navigate(['/admin-choice']);
    } else {
      this.router.navigate(['/events']);
    }
  }

  getRoleLabel(role: string): string {
    const r = role.toUpperCase();
    if (r.includes('ADMIN')) return 'Administrateur';
    if (r.includes('SPORTIF') || r.includes('USER')) return 'Sportif';
    if (r.includes('ORGANIZER') || r.includes('ORGANISATEUR')) return 'Organisateur';
    if (r.includes('SPONSOR')) return 'Sponsor';
    if (r.includes('COACH')) return 'Coach';
    return role;
  }

  getRoleIcon(role: string): string {
    const r = role.toUpperCase();
    if (r.includes('ADMIN')) return 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
    if (r.includes('ORGANIZER') || r.includes('ORGANISATEUR')) return 'M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z';
    if (r.includes('SPONSOR')) return 'M12 1l2.753 8.472H23l-7.18 5.22 2.753 8.472L12 18.944l-6.573 4.22 2.753-8.473L2 9.472h8.247L12 1z';
    if (r.includes('COACH')) return 'M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z';
    return 'M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z';
  }
  getDropdownBottom(): string {
    const el = document.querySelector('.profile-card');
    if (el) {
      const rect = el.getBoundingClientRect();
      return (window.innerHeight - rect.top + 8) + 'px';
    }
    return '120px';
  }
  isCoachRoute(): boolean {
    return this.router.url.includes('/coach');
  }

  toggleThemeList(event: Event) {
    event.stopPropagation();
    this.themeListExpanded = !this.themeListExpanded;
    if (this.themeListExpanded) {
      this.roleListExpanded = false;
    }
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

  toggle(group: NavGroup) {
    if (!group.children?.length) {
      if (group.path) {
        this.router.navigate([group.path]);
        this.navOpen = false;
      }
      return;
    }

    const wasExpanded = !!group.expanded;
    this.navGroups.forEach(g => {
      if (g.children?.length) { g.expanded = false; }
    });
    group.expanded = !wasExpanded;
  }

  isGroupActive(group: NavGroup): boolean {
    if (group.children?.length) {
      return group.children.some(child => this.router.url.startsWith(child.path));
    }
    return !!group.path && this.router.url.startsWith(group.path);
  }
}
