import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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
}

@Injectable({ providedIn: 'root' })
export class RewardService {

  private base = environment.rewardServiceUrl;

  constructor(private http: HttpClient) { }

  getRewards(): Observable<Reward[]> {
    return this.http.get<Reward[]>(this.base);
  }

  getRewardById(id: string): Observable<Reward> {
    return this.http.get<Reward>(`${this.base}/${id}`);
  }

  createReward(body: CreateRewardRequest): Observable<Reward> {
    return this.http.post<Reward>(this.base, body);
  }

  updateReward(id: string, body: UpdateRewardRequest): Observable<Reward> {
    return this.http.put<Reward>(`${this.base}/${id}`, body);
  }

  deleteReward(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getRewardsByUser(userId: string): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.base}/user/${userId}`);
  }

  getRewardsByTeam(teamId: string): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.base}/team/${teamId}`);
  }
}

