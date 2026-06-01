import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SponsorAIService {
  private base = 'http://localhost:8001/api/sponsor-ai';

  constructor(private http: HttpClient) {}

  generateDescription(campaignName: string, targetSport?: string): Observable<{ description: string }> {
    return this.http.post<{ description: string }>(`${this.base}/generate-description`, {
      campaignName,
      targetSport
    });
  }

  matchScore(sponsorName: string, sponsorDescription: string, eventName: string, eventSport: string): Observable<{ score: number }> {
    return this.http.post<{ score: number }>(`${this.base}/match-score`, {
      sponsorName,
      sponsorDescription,
      eventName,
      eventSport
    });
  }

  analyzeCampaigns(campaigns: any[]): Observable<{ analysis: string }> {
    return this.http.post<{ analysis: string }>(`${this.base}/analyze`, {
      campaigns
    });
  }

  suggestSponsors(eventDescription: string, eventSport: string, sponsors: any[]): Observable<{ suggestion: string }> {
    return this.http.post<{ suggestion: string }>(`${this.base}/suggest`, {
      eventDescription,
      eventSport,
      sponsors
    });
  }
}
