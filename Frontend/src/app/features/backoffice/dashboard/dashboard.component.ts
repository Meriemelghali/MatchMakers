import { Component, OnInit } from '@angular/core';
import { ReclamationService } from '../../../core/services/reclamation.service';

@Component({
  selector: 'app-dashboard-overview',
  template: `
    <div class="dashboard-container">
      <div class="header-section">
        <h1>Tableau de Bord</h1>
        <div class="date-badge">{{ today | date:'fullDate' }}</div>
      </div>

      <div class="welcome-banner">
        <div class="banner-content">
          <h2>Content de vous revoir, Admin ! 👋</h2>
          <p>L'intelligence artificielle MatchMakers surveille la plateforme en temps réel.</p>
        </div>
        <div class="banner-ai-status">
          <div class="pulse-icon">🤖</div>
          <div class="status-text">IA ACTIVE</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">UTILISATEURS</span>
          <span class="stat-value">1,248</span>
          <span class="stat-trend positive">+12% cette semaine</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">ÉVÉNEMENTS</span>
          <span class="stat-value">84</span>
          <span class="stat-trend positive">+5 nouveaux</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">RÉCLAMATIONS TOTALES</span>
          <span class="stat-value">{{ stats?.totalReclamations || 0 }}</span>
          <span class="stat-trend" [class.negative]="(stats?.byUrgence?.HAUTE > 0)">
            {{ stats?.byUrgence?.HAUTE || 0 }} critiques détectées
          </span>
        </div>
      </div>

      <div class="ai-moderation-section">
        <div class="section-header">
          <i class="fas fa-shield-alt"></i>
          <h3>Modération & Analyse IA</h3>
        </div>

        <div class="ai-cards-grid">
          <!-- Type Distribution -->
          <div class="ai-card">
            <div class="ai-card-title">Distribution des Signalements</div>
            <div class="ai-chart-placeholder">
              <div class="bar-group" *ngFor="let type of objectKeys(stats?.byType || {})">
                <div class="bar-label">{{ type }}</div>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="getPercentage(stats.byType[type], stats.totalReclamations)"></div>
                </div>
                <div class="bar-value">{{ stats.byType[type] }}</div>
              </div>
            </div>
          </div>

          <!-- Auto Actions -->
          <div class="ai-card">
            <div class="ai-card-title">Actions Automatiques</div>
            <div class="auto-actions-list">
              <div class="action-item">
                <div class="action-icon warning"><i class="fas fa-gavel"></i></div>
                <div class="action-info">
                  <div class="action-val">{{ stats?.totalSanctions || 0 }}</div>
                  <div class="action-label">Sanctions générées</div>
                </div>
              </div>
              <div class="action-item">
                <div class="action-icon success"><i class="fas fa-magic"></i></div>
                <div class="action-info">
                  <div class="action-val">{{ stats?.totalAutoResolved || 0 }}</div>
                  <div class="action-label">Résolutions auto</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Urgency Status -->
          <div class="ai-card urgency-card">
            <div class="ai-card-title">État de Vigilance</div>
            <div class="urgency-meter">
              <div class="meter-circle" [class.high-alert]="stats?.byUrgence?.HAUTE > 0">
                <span class="meter-val">{{ stats?.byUrgence?.HAUTE > 0 ? 'ALERTE' : 'CALME' }}</span>
              </div>
              <p class="meter-desc" *ngIf="stats?.byUrgence?.HAUTE > 0">
                L'IA a détecté des comportements toxiques nécessitant une intervention.
              </p>
              <p class="meter-desc" *ngIf="!(stats?.byUrgence?.HAUTE > 0)">
                Aucun incident critique détecté par l'IA sur les dernières 24h.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 2.5rem; max-width: 1300px; margin: 0 auto; font-family: 'Inter', sans-serif; }
    
    .header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    h1 { font-weight: 900; font-size: 2.4rem; margin: 0; letter-spacing: -0.05em; color: #1a1a1a; }
    .date-badge { background: #f0f0f0; padding: 0.6rem 1.2rem; border-radius: 100px; font-weight: 700; color: #666; font-size: 0.9rem; }

    .welcome-banner { 
      background: linear-gradient(135deg, #000 0%, #222 100%); 
      color: #fff; padding: 3.5rem; border-radius: 32px; margin-bottom: 2.5rem;
      display: flex; justify-content: space-between; align-items: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      position: relative; overflow: hidden;
    }
    .welcome-banner::after {
      content: ''; position: absolute; top: -50%; right: -10%; width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(232, 80, 10, 0.15) 0%, transparent 70%);
    }
    .welcome-banner h2 { font-weight: 800; font-size: 2.2rem; margin-bottom: 0.8rem; letter-spacing: -0.02em; }
    .welcome-banner p { opacity: 0.7; font-size: 1.2rem; font-weight: 500; }

    .banner-ai-status { display: flex; flex-direction: column; align-items: center; gap: 12px; z-index: 2; }
    .pulse-icon { 
      width: 64px; height: 64px; background: rgba(232, 80, 10, 0.2); 
      border-radius: 20px; display: flex; align-items: center; justify-content: center;
      font-size: 1.8rem; color: #E8500A; animation: pulse 2s infinite;
    }
    .status-text { font-size: 0.75rem; font-weight: 900; letter-spacing: 0.2em; color: #E8500A; }

    @keyframes pulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(232, 80, 10, 0.4); }
      70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(232, 80, 10, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(232, 80, 10, 0); }
    }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem; margin-bottom: 4rem; }
    .stat-card { 
      background: #fff; border: 1px solid #f0f0f0; padding: 2.5rem; border-radius: 24px; 
      transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.02);
    }
    .stat-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0,0,0,0.05); }
    .stat-label { font-size: 0.75rem; font-weight: 800; color: #a0a0a0; letter-spacing: 0.1em; margin-bottom: 1rem; text-transform: uppercase; }
    .stat-value { font-size: 2.8rem; font-weight: 900; color: #000; margin-bottom: 0.8rem; letter-spacing: -0.03em; }
    .stat-trend { font-size: 0.95rem; font-weight: 700; color: #666; }
    .stat-trend.positive { color: #10b981; }
    .stat-trend.negative { color: #ef4444; }

    .ai-moderation-section { background: #f9fafb; padding: 3rem; border-radius: 32px; border: 1px solid #f0f0f0; }
    .section-header { display: flex; align-items: center; gap: 15px; margin-bottom: 2.5rem; }
    .section-header i { font-size: 1.5rem; color: #E8500A; }
    .section-header h3 { font-size: 1.6rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; }

    .ai-cards-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 2rem; }
    .ai-card { background: #fff; padding: 2rem; border-radius: 24px; border: 1px solid #eee; }
    .ai-card-title { font-size: 1rem; font-weight: 800; color: #333; margin-bottom: 2rem; }

    .bar-group { margin-bottom: 1.5rem; }
    .bar-label { font-size: 0.8rem; font-weight: 700; color: #666; margin-bottom: 8px; text-transform: capitalize; }
    .bar-container { height: 10px; background: #f0f0f0; border-radius: 100px; overflow: hidden; margin-bottom: 6px; }
    .bar-fill { height: 100%; background: #E8500A; border-radius: 100px; transition: width 1s ease-out; }
    .bar-value { font-size: 0.8rem; font-weight: 800; color: #000; text-align: right; }

    .auto-actions-list { display: flex; flex-direction: column; gap: 20px; }
    .action-item { display: flex; align-items: center; gap: 20px; padding: 1.2rem; background: #fcfcfc; border-radius: 16px; border: 1px solid #f0f0f0; }
    .action-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
    .action-icon.warning { background: rgba(232, 80, 10, 0.1); color: #E8500A; }
    .action-icon.success { background: rgba(16, 185, 129, 0.1); color: #10B981; }
    .action-val { font-size: 1.4rem; font-weight: 800; color: #000; }
    .action-label { font-size: 0.85rem; font-weight: 600; color: #888; }

    .urgency-meter { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 20px; }
    .meter-circle { 
      width: 120px; height: 120px; border-radius: 50%; border: 8px solid #f0f0f0;
      display: flex; align-items: center; justify-content: center; transition: all 0.5s;
    }
    .meter-circle.high-alert { border-color: #ef4444; background: rgba(239, 68, 68, 0.05); color: #ef4444; }
    .meter-val { font-size: 0.9rem; font-weight: 900; letter-spacing: 0.1em; }
    .meter-desc { font-size: 0.9rem; color: #666; line-height: 1.5; font-weight: 500; }
  `]
})
export class DashboardComponent implements OnInit {
  today = new Date();
  stats: any = null;
  objectKeys = Object.keys;

  constructor(private reclamationService: ReclamationService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats() {
    this.reclamationService.getAIStats().subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (err) => console.error('Error loading AI stats', err)
    });
  }

  getPercentage(value: number, total: number): number {
    if (!total) return 0;
    return (value / total) * 100;
  }
}
