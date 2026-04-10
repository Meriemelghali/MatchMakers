import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TeamMember {
  userId: string;
  username: string;
  role: string;
  joinDate: string;
}

export interface Team {
  id?: string;
  name: string;
  sport: string;
  description?: string;
  logoUrl?: string;
  ownerId?: string;
  city?: string;
  country?: string;
  foundedYear?: number;
  coachName?: string;
  homeStadium?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  isPublic?: boolean;
  members?: TeamMember[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTeamRequest {
  name: string;
  sport: string;
  description?: string;
  logoUrl?: string;
  city?: string;
  country?: string;
  foundedYear?: number;
  coachName?: string;
  homeStadium?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  isPublic?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TeamService {

  private base = environment.teamServiceUrl;

  constructor(private http: HttpClient) { }

  getTeams(sport?: string): Observable<Team[]> {
    let params = new HttpParams();
    if (sport) {
      params = params.set('sport', sport);
    }
    return this.http.get<Team[]>(this.base, { params });
  }

  getTeamById(id: string): Observable<Team> {
    return this.http.get<Team>(`${this.base}/${id}`);
  }

  createTeam(body: CreateTeamRequest): Observable<Team> {
    return this.http.post<Team>(this.base, body);
  }

  updateTeam(id: string, body: Partial<CreateTeamRequest>): Observable<Team> {
    return this.http.put<Team>(`${this.base}/${id}`, body);
  }

  deleteTeam(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  joinTeam(teamId: string, payload?: { userId?: string; username?: string; role?: string }): Observable<Team> {
    return this.http.post<Team>(`${this.base}/${teamId}/join`, payload ?? {});
  }

  leaveTeam(teamId: string, payload?: { userId?: string }): Observable<Team> {
    return this.http.post<Team>(`${this.base}/${teamId}/leave`, payload ?? {});
  }
}

