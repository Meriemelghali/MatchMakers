import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Team } from '../../features/teams/services/team.service';
import { Match } from '../models/match.model';

// ── Matchmaking ────────────────────────────────────────────────────────────

export interface MatchmakingTeamInfo {
  id?: string;
  name: string;
  sport: string;
  city?: string;
  country?: string;
  coachName?: string;
  memberCount?: number;
  description?: string;
}

export interface MatchmakingSuggestion {
  teamId:   string | null;
  teamName: string;
  score:    number;
  reason:   string;
}

export interface MatchmakingResponse {
  suggestions: MatchmakingSuggestion[];
  analysis:    string;
  from_llm:    boolean;
  latency_ms:  number;
}

// ── Match Summary ──────────────────────────────────────────────────────────

export interface SummaryResponse {
  summary:    string;
  from_llm:   boolean;
  latency_ms: number;
}

// ── Service ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class GeminiAiService {

  private base = environment.geminiAiServiceUrl;

  constructor(private http: HttpClient) {}

  /** Convert an Angular Team object to the lean payload the API expects */
  private toTeamInfo(t: Team): MatchmakingTeamInfo {
    return {
      id:          t.id,
      name:        t.name,
      sport:       t.sport,
      city:        t.city,
      country:     t.country,
      coachName:   t.coachName,
      memberCount: t.members?.length,
      description: t.description,
    };
  }

  /**
   * Ask Gemini to pick the best 3 opponents for `team` from `candidates`.
   */
  findBestOpponents(team: Team, candidates: Team[]): Observable<MatchmakingResponse> {
    const body = {
      team:       this.toTeamInfo(team),
      candidates: candidates.map(c => this.toTeamInfo(c)),
    };
    return this.http.post<MatchmakingResponse>(`${this.base}/matchmaking`, body);
  }

  /**
   * Ask Gemini to write a post-match narrative for a finished match.
   */
  generateMatchSummary(match: Match): Observable<SummaryResponse> {
    const body = {
      match: {
        titre:         match.titre,
        equipe1:       match.equipe1,
        equipe2:       match.equipe2,
        scoreEquipe1:  match.scoreEquipe1,
        scoreEquipe2:  match.scoreEquipe2,
        type:          match.type,
        statut:        match.statut,
        evenements:    match.evenements ?? [],
      },
    };
    return this.http.post<SummaryResponse>(`${this.base}/match-summary`, body);
  }
}
