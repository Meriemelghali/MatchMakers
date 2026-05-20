// auth-layout.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AIService, SportInspiration } from '../../core/services/UserService/ai.service';
import { AuthService } from '../../core/services/AuthService/auth.service';

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
  
  // AI Inspiration
  sportInspiration?: SportInspiration;
  showInspiration = false;
  isLoadingInspiration = false;

  constructor(private router: Router) { }
  constructor(
    private router: Router,
    private aiService: AIService,
    private authService: AuthService
  ) {}

  navLinks = [
    {
      path: '/events',
      label: 'Événement',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>'
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
    },
    {
      path: '/social',
      label: 'Réseau Social',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
    },
    {
      path: '/social/discussions',
      label: 'Messagerie',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>'
      path: '/reclamations',
      label: 'Réclamations',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
    },
    {
      path: '/teams',
      label: 'Équipes',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
    },
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
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="4" height="10" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>'
    },
     {
      path: 'sponsor/campaigns',
      label: 'Campagnes',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="4" height="10" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>'
    },
    {
      path: '/coach',
      label: 'Mon Coach IA',
      icon: '<i class="fas fa-robot"></i>'
    }
  ];

  ngOnInit() {
    this.clockInterval = setInterval(() => this.now = new Date(), 30000);
    this.loadUserInfo();
    document.addEventListener('click', () => {
      this.profileOpen = false;
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
  ngOnDestroy() { clearInterval(this.clockInterval); }
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

    // Rôle
    this.userRole = localStorage.getItem('userRole') || 'Admin';
  }
  logout(): void {
    localStorage.clear();
    this.profileOpen = false;
    this.router.navigate(['/login']);
  }
  myprofile(): void { }

  get isAdmin(): boolean {
    const role = this.userRole?.toUpperCase() || '';
    return role === 'ADMIN' || role === 'ROLE_ADMIN';
  }

  goToBackoffice(): void {
    this.router.navigate(['/admin-choice']);
  }

  myprofile(): void {}
  getDropdownBottom(): string {
    const el = document.querySelector('.profile-card');
    if (el) {
      const rect = el.getBoundingClientRect();
      return (window.innerHeight - rect.top + 8) + 'px';
    }
    return '120px';
  }
}
