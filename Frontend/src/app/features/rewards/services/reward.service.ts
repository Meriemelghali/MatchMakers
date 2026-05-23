import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HttpParams } from '@angular/common/http';

export type RewardType =
  | 'TROPHY'
  | 'MEDAL'
  | 'CERTIFICATE'
  | 'MVP'
  | 'BEST_PLAYER'
  | 'BEST_TEAM';

export type RewardRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type RewardStatus = 'ACTIVE' | 'REVOKED';

export interface Reward {
  id?: string;
  name: string;
  type: RewardType;
  description?: string;
  dateAwarded: string;

  points?: number;
  rarity?: RewardRarity;
  status?: RewardStatus;
  imageUrl?: string;
  awardedBy?: string;
  revokedReason?: string;
  createdAt?: string;
  updatedAt?: string;

  userId?: string;
  username?: string;
  teamId?: string;
  teamName?: string;
  eventId?: string;

  level?: number;
  progress?: number;
  maxProgress?: number;
  evolutive?: boolean;
  evolutionRules?: any;

  // Visual design config for the medal designer (stored in DB)
  design?: RewardDesign;
}

export interface RewardDesign {
  version?: number;
  ribbonStyle?: 'CLASSIC' | 'NONE';
  accent?: string;
  accent2?: string;
  ribbonLeft?: string;
  ribbonRight?: string;
  title?: string;
  subtitle?: string;
  showText?: boolean;
  imageScale?: number;
  imageRotateDeg?: number;
  sourceImageUrl?: string; // original dropped image (data URL) for re-editing
  exportedAt?: string;
}

export interface CreateRewardRequest {
  name: string;
  type: RewardType;
  description?: string;
  dateAwarded: string;

  points?: number;
  rarity?: RewardRarity;
  imageUrl?: string;
  awardedBy?: string;

  userId?: string;
  username?: string;
  teamId?: string;
  teamName?: string;
  eventId?: string;
}

export interface UpdateRewardRequest extends Partial<CreateRewardRequest> {
  status?: RewardStatus;
  revokedReason?: string;
  evolutive?: boolean;
  maxProgress?: number;
  evolutionRules?: any;
  design?: RewardDesign;
}

export interface RewardEvolutionPreview {
  before: Reward;
  after: Reward;
  leveledUp: boolean;
  levelsGained: number;
  message?: string;
}

export interface RewardProgressRequest {
  delta: number;
  reason?: string;
  autoEvolve?: boolean;
}

export interface RewardAIGenerateRequest {
  eventType: string;
  teamCount: number;
  difficulty: string;
}

export interface RewardAISuggestion {
  name: string;
  description: string;
  type: RewardType;
  rarity: RewardRarity;
  points: number;
}

export interface RewardDashboardItem {
  label: string;
  count: number;
}

export interface RewardDashboard {
  total: number;
  byType: RewardDashboardItem[];
  byTeam: RewardDashboardItem[];
  avgPoints?: number | null;
  maxPoints?: number | null;
  generatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class RewardService {

  /**
   * Base URL du micro-service Rewards (Spring Boot).
   * Exemple en dev: http://localhost:8086/rewards/api/rewards
   */
  private base = environment.rewardServiceUrl;

  constructor(private http: HttpClient) { }

  /** GET {base} -> liste de toutes les recompenses */
  getRewards(): Observable<Reward[]> {
    return this.http.get<Reward[]>(this.base);
  }

  /** GET {base}/{id} -> details d'une recompense */
  getRewardById(id: string): Observable<Reward> {
    return this.http.get<Reward>(`${this.base}/${id}`);
  }

  /** POST {base} -> creation d'une recompense */
  createReward(body: CreateRewardRequest): Observable<Reward> {
    return this.http.post<Reward>(this.base, body);
  }

  /** PUT {base}/{id} -> update (partiel) d'une recompense */
  updateReward(id: string, body: UpdateRewardRequest): Observable<Reward> {
    return this.http.put<Reward>(`${this.base}/${id}`, body);
  }

  /** DELETE {base}/{id} -> suppression */
  deleteReward(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** GET {base}/user/{userId} -> recompenses d'un user */
  getRewardsByUser(userId: string): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.base}/user/${userId}`);
  }

  /** GET {base}/team/{teamId} -> recompenses d'une equipe */
  getRewardsByTeam(teamId: string): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.base}/team/${teamId}`);
  }

  /** POST {base}/{id}/progress -> ajoute de la progression (et peut auto-evolve) */
  progressReward(id: string, body: RewardProgressRequest): Observable<RewardEvolutionPreview> {
    return this.http.post<RewardEvolutionPreview>(`${this.base}/${id}/progress`, body);
  }

  /** POST {base}/{id}/evolve -> force une evolution immediatement */
  evolveReward(id: string): Observable<RewardEvolutionPreview> {
    return this.http.post<RewardEvolutionPreview>(`${this.base}/${id}/evolve`, {});
  }

  /**
   * POST /api/ai/rewards/generate (sur le meme service Spring).
   * Note: la base 'rewardServiceUrl' finit par /api/rewards, donc on retire ce suffixe.
   */
  generateRewardsWithAi(body: RewardAIGenerateRequest): Observable<RewardAISuggestion[]> {
    const baseUrl = this.base.replace(/\/api\/rewards\/?$/, '');
    return this.http.post<RewardAISuggestion[]>(`${baseUrl}/api/ai/rewards/generate`, body);
  }

  /** GET {base}/dashboard -> stats (total, byType, byTeam, avg/max points) avec filtres optionnels */
  getDashboard(params: {
    teamId?: string;
    q?: string;
    type?: string;
    rarity?: string;
    status?: string;
  }): Observable<RewardDashboard> {
    let httpParams = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (!s) continue;
      httpParams = httpParams.set(k, s);
    }
    return this.http.get<RewardDashboard>(`${this.base}/dashboard`, { params: httpParams });
  }
}

