// Force recompile after file creation
import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

// Services Imports
import { UserManagementService } from '../../../core/services/UserService/user-management.service';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { SportService } from '../../sports/services/sport.service';
import { TeamService } from '../../teams/services/team.service';
import { RewardService } from '../../rewards/services/reward.service';
import { ReservationService } from '../../reservations/services/reservation.service';
import { ProductService } from '../../products/services/product.service';
import { SponsorService } from '../../sponsor/services/sponsor.service';

@Component({
  selector: 'app-dashboard-overview',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  // Statistics
  usersCount = 0;
  reclamationsCount = 0;
  reservationsCount = 0;
  productsCount = 0;
  sponsorsCount = 0;
  teamsCount = 0;
  sportsCount = 0;
  rewardsCount = 0;
  avgRewardPoints = 0;

  // Lists & Detailed Data
  urgentReclamations: any[] = [];
  recentReservations: any[] = [];
  sportsList: any[] = [];
  rewardTypes: { label: string; count: number; percentage: number }[] = [];

  // Metadata & UI States
  loading = true;
  currentDate = '';
  isSystemHealthy = true;
  totalServicesCount = 8;
  onlineServicesCount = 8;

  // Service Health Trackers
  health = {
    users: { name: 'Users Service', port: 8081, status: true },
    reclamations: { name: 'Reclamations Service', port: 8082, status: true },
    sports: { name: 'Sports & Categories Service', port: 8084, status: true },
    teams: { name: 'Teams Service', port: 8085, status: true },
    rewards: { name: 'Rewards Service', port: 8086, status: true },
    reservations: { name: 'Reservations Service', port: 8089, status: true },
    sponsors: { name: 'Sponsors Service', port: 8091, status: true },
    products: { name: 'Products Service', port: 8092, status: true }
  };

  constructor(
    private userService: UserManagementService,
    private reclamationService: ReclamationService,
    private sportService: SportService,
    private teamService: TeamService,
    private rewardService: RewardService,
    private reservationService: ReservationService,
    private productService: ProductService,
    private sponsorService: SponsorService
  ) {}

  ngOnInit(): void {
    this.setFormattedDate();
    this.fetchDashboardData();
  }

  setFormattedDate(): void {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    this.currentDate = new Date().toLocaleDateString('fr-FR', options);
  }

  fetchDashboardData(): void {
    this.loading = true;
    this.onlineServicesCount = 0;

    // Define parallel requests with standalone error catchers so one service failing doesn't break the forkJoin
    const usersReq = this.userService.getAllUsers().pipe(
      catchError(err => {
        console.error('Dashboard: UserService failed', err);
        this.health.users.status = false;
        return of([]);
      })
    );

    const reclamationsReq = this.reclamationService.getUrgentReclamations().pipe(
      catchError(err => {
        console.error('Dashboard: ReclamationService failed', err);
        this.health.reclamations.status = false;
        return of([]);
      })
    );

    const sportsReq = this.sportService.getAll().pipe(
      catchError(err => {
        console.error('Dashboard: SportService failed', err);
        this.health.sports.status = false;
        return of([]);
      })
    );

    const teamsReq = this.teamService.getTeams().pipe(
      catchError(err => {
        console.error('Dashboard: TeamService failed', err);
        this.health.teams.status = false;
        return of([]);
      })
    );

    const rewardsReq = this.rewardService.getDashboard({}).pipe(
      catchError(err => {
        console.error('Dashboard: RewardService failed', err);
        this.health.rewards.status = false;
        return of(null);
      })
    );

    const reservationsReq = this.reservationService.getReservations(0, 5).pipe(
      catchError(err => {
        console.error('Dashboard: ReservationService failed', err);
        this.health.reservations.status = false;
        return of(null);
      })
    );

    const productsReq = this.productService.getAll().pipe(
      catchError(err => {
        console.error('Dashboard: ProductService failed', err);
        this.health.products.status = false;
        return of([]);
      })
    );

    const sponsorsReq = this.sponsorService.getAll().pipe(
      catchError(err => {
        console.error('Dashboard: SponsorService failed', err);
        this.health.sponsors.status = false;
        return of([]);
      })
    );

    forkJoin({
      users: usersReq,
      reclamations: reclamationsReq,
      sports: sportsReq,
      teams: teamsReq,
      rewards: rewardsReq,
      reservations: reservationsReq,
      products: productsReq,
      sponsors: sponsorsReq
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          // Calculate health counts
          this.onlineServicesCount = Object.values(this.health).filter(s => s.status).length;
          this.isSystemHealthy = this.onlineServicesCount === this.totalServicesCount;
        })
      )
      .subscribe({
        next: (res: any) => {
          // Users
          if (this.health.users.status && res.users) {
            this.usersCount = res.users.length;
          }

          // Reclamations
          if (this.health.reclamations.status && res.reclamations) {
            this.urgentReclamations = res.reclamations;
            this.reclamationsCount = res.reclamations.length;
          }

          // Sports
          if (this.health.sports.status && res.sports) {
            this.sportsList = res.sports.slice(0, 6); // Top 6 sports to show
            this.sportsCount = res.sports.length;
          }

          // Teams
          if (this.health.teams.status && res.teams) {
            this.teamsCount = res.teams.length;
          }

          // Products
          if (this.health.products.status && res.products) {
            this.productsCount = res.products.length;
          }

          // Sponsors
          if (this.health.sponsors.status && res.sponsors) {
            this.sponsorsCount = res.sponsors.length;
          }

          // Rewards
          if (this.health.rewards.status && res.rewards) {
            const rDash = res.rewards;
            this.rewardsCount = rDash.total || 0;
            this.avgRewardPoints = Math.round(rDash.avgPoints || 0);
            
            // Format reward type distributions
            if (rDash.byType && rDash.byType.length > 0) {
              const totalDist = rDash.byType.reduce((acc: number, item: any) => acc + (item.count || 0), 0) || 1;
              this.rewardTypes = rDash.byType.map((item: any) => ({
                label: item.label || item.type || 'Inconnu',
                count: item.count || 0,
                percentage: Math.round(((item.count || 0) / totalDist) * 100)
              }));
            }
          }

          // Reservations
          if (this.health.reservations.status && res.reservations) {
            this.reservationsCount = res.reservations.totalElements || 0;
            this.recentReservations = res.reservations.content || [];
          }
        },
        error: (err) => {
          console.error('Dashboard: Critical fetch error', err);
        }
      });
  }

  // Helper utility to translate urgency levels into French
  getUrgencyLabel(urgency: string | undefined): string {
    if (!urgency) return 'Basse';
    switch (urgency.toUpperCase()) {
      case 'HAUTE': return 'Haute';
      case 'MOYENNE': return 'Moyenne';
      case 'BASSE': return 'Basse';
      default: return urgency;
    }
  }

  // Helper utility to translate reservation status to French style
  getStatusClass(status: string | undefined): string {
    if (!status) return 'status-pending';
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'RESERVED':
        return 'status-confirmed';
      case 'PENDING':
        return 'status-pending';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }

  // Helper utility to format reservation status text
  getStatusLabel(status: string | undefined): string {
    if (!status) return 'En attente';
    switch (status.toUpperCase()) {
      case 'CONFIRMED': return 'Confirmé';
      case 'COMPLETED': return 'Terminé';
      case 'RESERVED': return 'Réservé';
      case 'PENDING': return 'En attente';
      case 'CANCELLED': return 'Annulé';
      case 'NO_SHOW': return 'Non présenté';
      default: return status;
    }
  }

  // Trigger manual service diagnostics refresh
  refreshDiagnostics(): void {
    // Reset status flags and trigger load
    Object.keys(this.health).forEach((key) => {
      (this.health as any)[key].status = true;
    });
    this.fetchDashboardData();
  }
}
