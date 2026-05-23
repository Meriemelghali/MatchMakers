import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RewardsSuggestRequest {
  goal?: string | null;
  type?: string | null;
  teamName?: string | null;
  dateAwarded?: string | null;
  currentName?: string | null;
  currentDescription?: string | null;
  currentPoints?: number | null;
  currentRarity?: string | null;
  model?: string | null;
}

export interface RewardsSuggestResponse {
  name: string;
  description: string;
  points: number;
  rarity?: string | null;
  awardedBy?: string | null;
  rationale?: string | null;
  from_llm?: boolean;
  fromLlm?: boolean;
  model?: string | null;
  latency_ms?: number;
  latencyMs?: number;
}

export interface RewardsInsightsRequest {
  question: string;
  context?: string | null;
  model?: string | null;
}

export interface RewardsInsightsResponse {
  answer: string;
  from_llm?: boolean;
  fromLlm?: boolean;
  model?: string | null;
  latency_ms?: number;
  latencyMs?: number;
}

export interface AiHealthResponse {
  ok: boolean;
  provider?: string;
  openrouter_model?: string;
  openrouter_key_configured?: boolean;
  ollama_model?: string;
}

@Injectable({ providedIn: 'root' })
export class RewardsAiService {
  // Base URL du service IA (PythonAI FastAPI).
  private base = (environment.aiServiceUrl ?? '').replace(/\/$/, '');

  // HttpClient special qui bypass les interceptors (HttpBackend direct).
  // But: ne pas envoyer de tokens Authorization vers PythonAI par erreur.
  private aiHttp: HttpClient;

  constructor(httpBackend: HttpBackend) {
    // Security: bypass interceptors so we don't leak Authorization tokens to PythonAI.
    this.aiHttp = new HttpClient(httpBackend);
  }

  // POST /rewards/suggest : genere une suggestion (nom/description/points/rarity) selon le contexte.
  suggest(body: RewardsSuggestRequest): Observable<RewardsSuggestResponse> {
    return this.aiHttp.post<RewardsSuggestResponse>(`${this.base}/rewards/suggest`, body);
  }

  // POST /rewards/insights : question + contexte -> reponse "analyse" par l'IA.
  insights(body: RewardsInsightsRequest): Observable<RewardsInsightsResponse> {
    return this.aiHttp.post<RewardsInsightsResponse>(`${this.base}/rewards/insights`, body);
  }

  // GET /health : verifie que PythonAI est en ligne et donne des infos sur le provider.
  health(): Observable<AiHealthResponse> {
    return this.aiHttp.get<AiHealthResponse>(`${this.base}/health`);
  }
}
