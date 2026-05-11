import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-overview',
  template: `
    <div class="dashboard-container">
      <h1>Tableau de Bord</h1>
      <div class="welcome-banner">
        <h2>Content de vous revoir, Admin ! 👋</h2>
        <p>Voici un aperçu rapide de l'activité de votre plateforme.</p>
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
          <span class="stat-label">RÉSERVATIONS</span>
          <span class="stat-value">312</span>
          <span class="stat-trend negative">-2% vs hier</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-weight: 900; font-size: 2rem; margin-bottom: 2rem; letter-spacing: -0.04em; }
    .welcome-banner { background: #000; color: #fff; padding: 3rem; border-radius: 24px; margin-bottom: 2rem; }
    .welcome-banner h2 { font-weight: 800; font-size: 1.8rem; margin-bottom: 0.5rem; }
    .welcome-banner p { opacity: 0.7; font-size: 1.1rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
    .stat-card { background: #fff; border: 1px solid #f0f0f0; padding: 2rem; border-radius: 20px; display: flex; flex-direction: column; }
    .stat-label { font-size: 0.7rem; font-weight: 800; color: #999; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .stat-value { font-size: 2.2rem; font-weight: 900; color: #000; margin-bottom: 0.5rem; }
    .stat-trend { font-size: 0.85rem; font-weight: 700; }
    .stat-trend.positive { color: #10b981; }
    .stat-trend.negative { color: #ef4444; }
  `]
})
export class DashboardComponent {}
