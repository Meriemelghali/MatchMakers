import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TeamService, Team } from '../services/team.service';

@Component({
  selector: 'app-teams-list',
  templateUrl: './teams-list.component.html',
  styleUrls: ['./teams-list.component.css']
})
export class TeamsListComponent implements OnInit {

  teams: Team[] = [];
  filtered: Team[] = [];
  visible: Team[] = [];
  loading = false;
  error = '';

  sportFilter = new FormControl<string>('');
  q = '';
  page = 1;
  pageSize = 12;
  totalPages = 1;

  constructor(private teamService: TeamService) { }

  ngOnInit(): void {
    this.load();
    this.sportFilter.valueChanges.subscribe(() => {
      this.page = 1;
      this.applyFilter();
    });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.teamService.getTeams().subscribe({
      next: data => {
        this.teams = data;
        this.applyFilter();
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.error = 'Impossible de charger les équipes.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    const sport = this.sportFilter.value?.toLowerCase();
    const q = this.q.trim().toLowerCase();

    let list = !sport
      ? [...this.teams]
      : this.teams.filter(t => t.sport?.toLowerCase() === sport);

    if (q) {
      list = list.filter(t =>
        (t.name ?? '').toLowerCase().includes(q) ||
        (t.city ?? '').toLowerCase().includes(q) ||
        (t.country ?? '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    this.filtered = list;
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    if (this.page > this.totalPages) this.page = this.totalPages;
    if (this.page < 1) this.page = 1;
    const start = (this.page - 1) * this.pageSize;
    this.visible = this.filtered.slice(start, start + this.pageSize);
  }

  setPage(p: number): void {
    this.page = p;
    this.applyFilter();
  }

  membersCount(t: Team): number {
    return t.members?.length ?? 0;
  }
}

