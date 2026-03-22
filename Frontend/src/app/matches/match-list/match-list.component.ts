import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MatchService } from '../services/match.service';
import { Match, MatchStatus, MatchType } from '../models/match.model';
import { TerrainService } from '../../terrains/services/terrain.service';

@Component({
    selector: 'app-match-list',
    templateUrl: './match-list.component.html',
    styleUrls: ['./match-list.component.css']
})
export class MatchListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    matches: Match[] = [];
    filtered: Match[] = [];
    paged: Match[] = [];
    loading = false;
    error = '';

    terrainMap: Record<string, string> = {};

    statusFilter = new FormControl('');
    typeFilter = new FormControl('');

    page = 1;
    pageSize = 10;
    totalPages = 1;

    statuses: MatchStatus[] = ['PLANIFIE', 'EN_COURS', 'TERMINE', 'ANNULE', 'REPORTE'];
    types: MatchType[] = ['AMICAL', 'CHAMPIONNAT', 'COUPE', 'TOURNOI'];

    constructor(
        private matchService: MatchService,
        private terrainService: TerrainService,
        private router: Router
    ) { }

    ngOnInit() {
        this.load();

        this.statusFilter.valueChanges.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(() => this.applyFilter());

        this.typeFilter.valueChanges.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(() => this.applyFilter());
    }

    ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

    load() {
        this.loading = true;

        // Load terrains first for the lookup map
        this.terrainService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
            next: terrains => {
                terrains.forEach(t => {
                    if (t.id) this.terrainMap[t.id] = t.nom;
                });

                // Then load matches
                this.matchService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
                    next: data => { this.matches = data; this.applyFilter(); this.loading = false; },
                    error: () => { this.error = 'Erreur lors du chargement des matchs'; this.loading = false; }
                });
            },
            error: () => {
                // Ignore terrain error, still load matches
                this.matchService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
                    next: data => { this.matches = data; this.applyFilter(); this.loading = false; },
                    error: () => { this.error = 'Erreur lors du chargement des matchs'; this.loading = false; }
                });
            }
        });
    }

    applyFilter() {
        let data = [...this.matches];
        const s = this.statusFilter.value;
        const t = this.typeFilter.value;
        if (s) data = data.filter(m => m.statut === s);
        if (t) data = data.filter(m => m.type === t);
        this.filtered = data;
        this.totalPages = Math.max(1, Math.ceil(data.length / this.pageSize));
        this.page = 1;
        this.updatePage();
    }

    updatePage() {
        const start = (this.page - 1) * this.pageSize;
        this.paged = this.filtered.slice(start, start + this.pageSize);
    }

    onPageChange(p: number) { this.page = p; this.updatePage(); }

    goToDetail(id: string) { this.router.navigate(['/matches', id]); }

    delete(id: string, e: Event) {
        e.stopPropagation();
        if (!confirm('Supprimer ce match ?')) return;
        this.matchService.delete(id).pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
    }

    formatDate(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
}
