import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin, of, Subject, catchError } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ReclamationService } from '../../../core/services/reclamation.service';
import { UserManagementService } from '../../../core/services/UserService/user-management.service';
import { ReservationService } from '../../reservations/services/reservation.service';
import { ProductService } from '../../products/services/product.service';
import { SponsorService } from '../../sponsor/services/sponsor.service';
import { TeamService } from '../../teams/services/team.service';
import { SportService } from '../../sports/services/sport.service';
import { RewardService } from '../../rewards/services/reward.service';

@Component({
  selector: 'app-dashboard-overview',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentDate = new Date();
  today = new Date();
  
  loading = true;
  isSystemHealthy = true;
  onlineServicesCount = 0;
  totalServicesCount = 8;
  
  // KPI Data
  usersCount = 0;
  reservationsCount = 0;
  reclamationsCount = 0;
  productsCount = 0;
  sponsorsCount = 0;
  teamsCount = 0;
  sportsCount = 0;
  rewardsCount = 0;
  avgRewardPoints = 0;

  // Detail Data
  urgentReclamations: any[] = [];
  recentReservations: any[] = [];
  rewardTypes: any[] = [];
  sportsList: any[] = [];

  // AI Moderation Data
  stats: any = null;
  objectKeys = Object.keys;

  health: { [key: string]: { name: string, port: string, status: boolean } } = {
    users: { name: 'Utilisateurs (UserService)', port: '8081', status: true },
    reservations: { name: 'Réservations (ReservationService)', port: '8089', status: true },
    reclamations: { name: 'Réclamations (ReclamationService)', port: '8082', status: true },
    products: { name: 'Produits (ProductService)', port: '8092', status: true },
    sponsors: { name: 'Sponsors (SponsorService)', port: '8090', status: true },
    teams: { name: 'Équipes (TeamService)', port: '8085', status: true },
    sports: { name: 'Sports (SportService)', port: '8084', status: true },
    rewards: { name: 'Fidélité (RewardService)', port: '8086', status: true }
  };

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserManagementService,
    private reservationService: ReservationService,
    private reclamationService: ReclamationService,
    private productService: ProductService,
    private sponsorService: SponsorService,
    private teamService: TeamService,
    private sportService: SportService,
    private rewardService: RewardService
  ) {}

  ngOnInit(): void {
    this.refreshDiagnostics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshDiagnostics() {
    this.loading = true;
    
    // reset health to true initially
    Object.keys(this.health).forEach(k => this.health[k].status = true);
    
    this.loadStats();
    
    // Simulate fetching all data in parallel and catching errors to determine health
    forkJoin({
      users: this.userService.getAllUsers().pipe(catchError(() => { this.setHealth('users', false); return of([]); })),
      reservations: this.reservationService.getReservations(0, 10).pipe(catchError(() => { this.setHealth('reservations', false); return of({ content: [], totalElements: 0 }); })),
      urgentReclamations: this.reclamationService.getUrgentReclamations().pipe(catchError(() => { this.setHealth('reclamations', false); return of([]); })),
      allReclamations: this.reclamationService.getAllReclamations().pipe(catchError(() => { this.setHealth('reclamations', false); return of([]); })),
      products: this.productService.getAll().pipe(catchError(() => { this.setHealth('products', false); return of([]); })),
      sponsors: this.sponsorService.getAll().pipe(catchError(() => { this.setHealth('sponsors', false); return of([]); })),
      teams: this.teamService.getTeams().pipe(catchError(() => { this.setHealth('teams', false); return of([]); })),
      sports: this.sportService.getAll().pipe(catchError(() => { this.setHealth('sports', false); return of([]); })),
      rewards: this.rewardService.getRewards().pipe(catchError(() => { this.setHealth('rewards', false); return of([]); }))
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      // Process Users
      this.usersCount = data.users?.length || 0;
      
      // Process Reservations
      const resData: any = data.reservations;
      this.reservationsCount = resData.totalElements || resData.content?.length || (Array.isArray(resData) ? resData.length : 0) || 0;
      this.recentReservations = Array.isArray(resData) ? resData.slice(0, 5) : (resData.content?.slice(0, 5) || []);

      // Process Reclamations
      this.urgentReclamations = data.urgentReclamations || [];
      this.reclamationsCount = data.allReclamations?.length || 0;

      // Process Products, Sponsors, Teams, Sports
      this.productsCount = data.products?.length || 0;
      this.sponsorsCount = data.sponsors?.length || 0;
      this.teamsCount = data.teams?.length || 0;
      this.sportsCount = data.sports?.length || 0;
      this.sportsList = data.sports || [];

      // Process Rewards
      const rewards = data.rewards || [];
      this.rewardsCount = rewards.length;
      let totalPoints = 0;
      const typeCount: { [key: string]: number } = {};
      
      rewards.forEach((r: any) => {
        totalPoints += (r.points || 0);
        const t = r.type || 'Standard';
        typeCount[t] = (typeCount[t] || 0) + 1;
      });
      this.avgRewardPoints = this.rewardsCount > 0 ? Math.round(totalPoints / this.rewardsCount) : 0;
      
      this.rewardTypes = Object.keys(typeCount).map(k => ({
        label: k,
        count: typeCount[k],
        percentage: Math.round((typeCount[k] / this.rewardsCount) * 100)
      }));

      this.recalculateHealth();
      this.loading = false;
    });
  }

  loadStats() {
    this.reclamationService.getAIStats().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (err) => console.error('Error loading AI stats', err)
    });
  }

  setHealth(serviceKey: string, status: boolean) {
    if (this.health[serviceKey]) {
      this.health[serviceKey].status = status;
    }
  }

  recalculateHealth() {
    let online = 0;
    Object.keys(this.health).forEach(k => {
      if (this.health[k].status) online++;
    });
    this.onlineServicesCount = online;
    this.isSystemHealthy = online === this.totalServicesCount;
  }

  getUrgencyLabel(urgency: string): string {
    switch (urgency) {
      case 'HAUTE': return 'Critique';
      case 'MOYENNE': return 'Attention';
      case 'FAIBLE': return 'Info';
      default: return urgency;
    }
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-pending';
    switch (status.toUpperCase()) {
      case 'CONFIRMED': return 'status-success';
      case 'PENDING': return 'status-warning';
      case 'CANCELLED': return 'status-danger';
      default: return 'status-default';
    }
  }

  getStatusLabel(status: string): string {
    if (!status) return 'En attente';
    switch (status.toUpperCase()) {
      case 'CONFIRMED': return 'Confirmé';
      case 'PENDING': return 'En attente';
      case 'CANCELLED': return 'Annulé';
      default: return status;
    }
  }

  getPercentage(value: number, total: number): number {
    if (!total) return 0;
    return (value / total) * 100;
  }

  getSportIcon(name: string): string {
    const n = name ? name.toLowerCase() : '';
    if (n.includes('foot')) return 'fas fa-futbol';
    if (n.includes('basket')) return 'fas fa-basketball-ball';
    if (n.includes('volley')) return 'fas fa-volleyball-ball';
    if (n.includes('tennis') && !n.includes('table')) return 'fas fa-baseball-ball'; 
    if (n.includes('table tennis') || n.includes('ping') || n.includes('badminton')) return 'fas fa-table-tennis';
    if (n.includes('handball')) return 'fas fa-baseball-ball'; 
    if (n.includes('run') || n.includes('course')) return 'fas fa-running';
    if (n.includes('cycl') || n.includes('bike') || n.includes('velo')) return 'fas fa-biking';
    if (n.includes('swim') || n.includes('natation')) return 'fas fa-swimmer';
    if (n.includes('golf')) return 'fas fa-golf-ball';
    return 'fas fa-trophy';
  }
}
