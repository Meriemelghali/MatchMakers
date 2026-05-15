import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoachService } from '../../core/services/UserService/coach.service';
import { AuthService } from '../../core/services/AuthService/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-coach-dashboard',
  templateUrl: './coach-dashboard.component.html',
  styleUrls: ['./coach-dashboard.component.css']
})
export class CoachDashboardComponent implements OnInit, OnDestroy {
  trainingPlan: any = null;
  isLoading = true;
  userId: string | null = null;
  private planSub!: Subscription;

  constructor(
    private coachService: CoachService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.userId = this.authService.getUserId();
    
    this.planSub = this.coachService.currentPlan$.subscribe(plan => {
      if (plan) {
        this.trainingPlan = plan;
        this.isLoading = false;
      }
    });

    if (this.userId) {
      this.loadTrainingPlan();
    }
  }

  ngOnDestroy(): void {
    if (this.planSub) {
      this.planSub.unsubscribe();
    }
  }

  loadTrainingPlan() {
    if (!this.userId) return;
    this.isLoading = true;
    this.coachService.getTodayPlan(this.userId).subscribe({
      next: () => {
        // State is updated via the behavior subject in CoachService
      },
      error: (err) => {
        console.error('Plan loading error:', err);
        this.isLoading = false;
      }
    });
  }
}
