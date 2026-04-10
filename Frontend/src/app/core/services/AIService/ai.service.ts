import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { EventType } from '../../../features/events/event.model';

export interface AISuggestion {
  maxTeams?: number;
  format?: string;
  durationDays?: number;
  rules?: string[];
  successProbability?: number;
  reasoning: string;
  recommendedType?: 'COMPETITION' | 'SIMPLE';
  newTypeProposal?: {
    typeName: string;
    icon: string;
    description: string;
    isCompetition: boolean;
    requiresTeams: boolean;
    requiresMatches: boolean;
  };
}
export interface ContextAnalysis {
  advice: string;
  requiresTerrain: boolean;
  requiresSpecialRoute: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {

  private readonly API = 'http://localhost:8083/eventsCompetitions/api/event-types/suggest';

  constructor(private http: HttpClient) { }

  /**
   * Generates catchy name suggestions for the event using Gemini.
   */
  generateNameSuggestions(sport: string, type: string): Observable<string[]> {
    const params = new HttpParams()
      .set('sport', sport)
      .set('type', type);
    return this.http.get<string[]>(`http://localhost:8083/eventsCompetitions/api/event-types/suggest-names`, { params });
  }

  /**
   * Generates a compelling event description based on sport and type using Gemini.
   */
  generateDescription(sport: string, type: string): Observable<string> {
    const params = new HttpParams()
      .set('sport', sport)
      .set('type', type);
    return this.http.get(`http://localhost:8083/eventsCompetitions/api/event-types/suggest-description`, { 
      params,
      responseType: 'text' 
    });
  }

  /**
   * Analyzes the context of a chosen sport and event type.
   */
  analyzeContext(sport: string, eventType: string): Observable<ContextAnalysis> {
    const params = new HttpParams()
      .set('sport', sport)
      .set('eventType', eventType);
    return this.http.get<ContextAnalysis>(`http://localhost:8083/eventsCompetitions/api/event-types/analyze-context`, { params });
  }


  /**
   * Calls the Backend AI to suggest the best configuration.
   */
  suggestConfiguration(sport: string, isCompetition: boolean): Observable<AISuggestion> {
    const params = new HttpParams()
      .set('sport', sport)
      .set('isCompetition', isCompetition.toString());
      
    return this.http.get<AISuggestion>(this.API, { params });
  }

  /**
   * AI Suggestions for creating a brand new event type.
   */
  suggestNewType(name: string): Observable<any> {
    const params = new HttpParams().set('name', name);
    return this.http.get<any>(`http://localhost:8083/eventsCompetitions/api/event-types/suggest-new`, { params });
  }

  /**
   * AI "Innovation" boost for an existing type.
   */
  innovateType(type: EventType): Observable<any> {
    return this.http.post<any>(`http://localhost:8083/eventsCompetitions/api/event-types/innovate`, type);
  }
}
