import { Component, OnInit } from '@angular/core';
import { CoachService } from '../../core/services/UserService/coach.service';
import { AuthService } from '../../core/services/AuthService/auth.service';

@Component({
  selector: 'app-coach-dashboard',
  templateUrl: './coach-dashboard.component.html',
  styleUrls: ['./coach-dashboard.component.css']
})
export class CoachDashboardComponent implements OnInit {
  trainingPlan: any = null;
  isLoading = true;
  userId: string | null = null;

  constructor(
    private coachService: CoachService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.userId = this.authService.getUserId();
    if (this.userId) {
      this.loadTrainingPlan();
    }
  }

  loadTrainingPlan() {
    if (!this.userId) return;
    this.isLoading = true;
    this.coachService.getTodayPlan(this.userId).subscribe({
      next: (res) => {
        console.log('Training Plan received:', res);
        this.trainingPlan = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Plan loading error:', err);
        this.isLoading = false;
      }
    });
  }
}
