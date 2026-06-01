import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClubService } from '../services/club.service';
import { Club } from '../models/club.model';
import { ClubResponseDto } from '../models/club-response.dto';
import { TeamService, Team } from '../../teams/services/team.service';
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { MatchService } from '../../../matches/services/match.service';
import { Match } from '../../../matches/models/match.model';

@Component({
  selector: 'app-club-detail',
  templateUrl: './club-detail.component.html',
  styleUrls: ['./club-detail.component.css']
})
export class ClubDetailComponent implements OnInit {
  clubId: string | null = null;
  club: Club | null = null;
  loading = true;
  error = '';
  
  uploading = false;
  uploadSuccess = '';
  uploadError = '';
  
  teamIdToAdd = '';
  
  // Real Match Stats
  teamStats: { [teamId: string]: { played: number, won: number, winRate: number, streak: number } } = {};
  
  // Search Teams
  allTeams: Team[] = [];
  filteredTeams: Team[] = [];
  teamSearchQuery = '';

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private clubService: ClubService,
    private router: Router,
    private teamService: TeamService,
    private authService: AuthService,
    private matchService: MatchService
  ) { }

  canManage(): boolean {
    const role = this.authService.getUserRole()?.toUpperCase();
    return role === 'ADMIN' || role === 'RESPONSABLE' || role === 'COACH';
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.clubId = params.get('id');
      if (this.clubId) {
        this.loadClub(this.clubId);
        this.loadAllTeams();
      } else {
        this.error = 'No club ID provided.';
        this.loading = false;
      }
    });
  }

  loadClub(id: string): void {
    this.loading = true;
    this.clubService.getDetail(id).subscribe({
      next: (data: any) => {
        this.club = data;
        this.loading = false;
        if (this.club?.teams) {
          this.analyzeTeams();
          this.loadMatchStats();
        }
      },
      error: (err: any) => {
        this.error = 'Failed to load club details.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadMatchStats(): void {
    if (!this.club?.teams || this.club.teams.length === 0) return;

    this.matchService.getAll().subscribe({
      next: (matches: Match[]) => {
        const finishedMatches = matches.filter((m: Match) => m.statut === 'TERMINE');
        
        this.club!.teams!.forEach(team => {
          const teamName = team.name;
          const teamId = team.id!;
          
          // Trouver tous les matchs de l'équipe, triés du plus récent au plus ancien
          const teamMatches = finishedMatches
            .filter((m: Match) => m.equipe1 === teamName || m.equipe2 === teamName)
            .sort((a: Match, b: Match) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime());
          
          let won = 0;
          let streak = 0;
          let streakActive = true;

          teamMatches.forEach((m: Match) => {
            const isEq1 = (m.equipe1 === teamName);
            const myScore = isEq1 ? m.scoreEquipe1 : m.scoreEquipe2;
            const oppScore = isEq1 ? m.scoreEquipe2 : m.scoreEquipe1;
            
            if (myScore > oppScore) {
              won++;
              if (streakActive) streak++;
            } else {
              streakActive = false;
            }
          });

          const played = teamMatches.length;
          const winRate = played > 0 ? (won / played) * 100 : 0;

          this.teamStats[teamId] = { played, won, winRate, streak };
        });
      },
      error: (err: any) => console.error('Error fetching matches for stats', err)
    });
  }

  analyzeTeams(): void {
    if (!this.club?.teams) return;
    this.club.teams.forEach(team => {
      this.analyzeTeam(team);
    });
  }

  analyzeTeam(team: Team): void {
    // Si les valeurs ne sont pas définies, on met des valeurs par défaut pour la démo
    const payload = {
      teamName: team.name,
      sport: team.sport,
      energy: team.energy ?? 100,
      fatigue: team.fatigue ?? 0,
      morale: team.morale ?? 100,
      recentActivity: "Saison régulière"
    };

    this.teamService.analyzeTeamPerformance(payload).subscribe({
      next: (analysis) => {
        team.performanceAnalysis = analysis;
      },
      error: (err) => console.error(`Error analyzing team ${team.name}:`, err)
    });
  }

  loadAllTeams(): void {
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        this.allTeams = teams;
      },
      error: (err) => console.error('Error loading teams:', err)
    });
  }

  onTeamSearch(query: string): void {
    this.teamSearchQuery = query;
    if (query.length > 1) {
      // Liste des noms de sports autorisés pour ce club
      const clubSports = this.club?.sports?.map(s => s.nameSport.toLowerCase()) || [];

      this.filteredTeams = this.allTeams.filter(team => {
        const matchesQuery = team.name.toLowerCase().includes(query.toLowerCase());
        // L'équipe doit pratiquer un sport supporté par le club
        const matchesSport = clubSports.includes(team.sport.toLowerCase());
        // L'équipe ne doit pas déjà être dans le club
        const notAlreadyAdded = !this.club?.teamIds?.includes(team.id!) && 
                                !this.club?.teams?.some(t => t.id === team.id);
        
        return matchesQuery && matchesSport && notAlreadyAdded;
      });
    } else {
      this.filteredTeams = [];
    }
  }

  selectTeam(team: Team): void {
    this.teamIdToAdd = team.id!;
    this.teamSearchQuery = team.name;
    this.filteredTeams = [];
  }

  getLogoUrl(urlOrName?: string): string {
    if (!urlOrName) return 'https://placehold.co/150/1a1a2e/00f2fe?text=No+Logo';
    
    if (urlOrName.startsWith('http') || urlOrName.startsWith('data:')) {
      return urlOrName;
    }
    
    return `http://localhost:8084/sports/api/clubs/logo/${urlOrName}`;
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file && this.clubId) {
      this.uploadLogo(file);
    }
  }

  uploadLogo(file: File): void {
    if (!this.clubId) return;
    
    this.uploading = true;
    this.uploadError = '';
    this.uploadSuccess = '';

    this.clubService.uploadLogo(this.clubId, file).subscribe({
      next: (updatedClub: any) => {
        this.club = updatedClub;
        this.uploading = false;
        this.uploadSuccess = 'Logo uploaded successfully!';
        setTimeout(() => this.uploadSuccess = '', 3000);
      },
      error: (err: any) => {
        this.uploading = false;
        this.uploadError = 'Failed to upload logo.';
        console.error(err);
      }
    });
  }

  deleteClub(): void {
    if (confirm('Are you sure you want to delete this club?') && this.clubId) {
      this.clubService.delete(this.clubId).subscribe({
        next: () => {
          this.router.navigate(['/clubs']);
        },
        error: (err: any) => {
          this.error = 'Failed to delete club.';
          console.error(err);
        }
      });
    }
  }
  
  editClub(): void {
    if (this.clubId) {
      this.router.navigate(['/clubs/edit', this.clubId]);
    }
  }

  addTeam(): void {
    if (!this.teamIdToAdd || !this.clubId) return;

    this.clubService.addTeam(this.clubId, this.teamIdToAdd).subscribe({
      next: (updatedClub: any) => {
        this.club = updatedClub;
        this.teamIdToAdd = '';
        this.teamSearchQuery = '';
      },
      error: (err: any) => {
        this.error = 'Failed to add team.';
      }
    });
  }

  removeTeam(teamId: string): void {
    if (!this.clubId) return;
    
    if (confirm('Are you sure you want to remove this team from the club?')) {
      this.clubService.removeTeam(this.clubId, teamId).subscribe({
        next: (updatedClub: any) => {
          this.club = updatedClub;
        },
        error: (err: any) => {
          this.error = 'Failed to remove team.';
        }
      });
    }
  }
}
