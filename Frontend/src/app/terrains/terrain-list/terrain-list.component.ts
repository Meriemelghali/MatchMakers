import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { TerrainService } from '../services/terrain.service';
import { Terrain, SportType, TerrainStatus } from '../models/terrain.model';

@Component({
    selector: 'app-terrain-list',
    templateUrl: './terrain-list.component.html',
    styleUrls: ['./terrain-list.component.css']
})
export class TerrainListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    terrains: Terrain[] = [];
    filtered: Terrain[] = [];
    loading = false;
    error = '';

    sportFilter = new FormControl('');
    statusFilter = new FormControl('');
    cityFilter = new FormControl('');

    sports: SportType[] = ['FOOTBALL', 'BASKETBALL', 'TENNIS', 'VOLLEYBALL', 'FUTSAL', 'PADEL', 'RUGBY', 'HANDBALL'];
    statuses: TerrainStatus[] = ['DISPONIBLE', 'OCCUPE', 'MAINTENANCE', 'FERME'];

    sportIcons: Record<string, string> = {
        FOOTBALL: '⚽', BASKETBALL: '🏀', TENNIS: '🎾', VOLLEYBALL: '🏐',
        FUTSAL: '⚽', PADEL: '🏸', RUGBY: '🏉', HANDBALL: '🤾'
    };

    constructor(private terrainService: TerrainService, private router: Router) { }

    ngOnInit() {
        this.load();
        for (const ctrl of [this.sportFilter, this.statusFilter, this.cityFilter]) {
            ctrl.valueChanges.pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
                .subscribe(() => this.applyFilter());
        }
    }

    ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

    load() {
        this.loading = true;
        this.terrainService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
            next: data => { this.terrains = data; this.applyFilter(); this.loading = false; },
            error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
        });
    }

    applyFilter() {
        let data = [...this.terrains];
        const sp = this.sportFilter.value;
        const st = this.statusFilter.value;
        const ci = this.cityFilter.value?.toLowerCase();
        if (sp) data = data.filter(t => t.typeSport === sp);
        if (st) data = data.filter(t => t.statut === st);
        if (ci) data = data.filter(t => t.ville?.toLowerCase().includes(ci));
        this.filtered = data;
    }

    resetFilters() { this.sportFilter.reset(); this.statusFilter.reset(); this.cityFilter.reset(); }

    icon(sport: string) { return this.sportIcons[sport] || '🏟️'; }

    goTo(id: string) { this.router.navigate(['/terrains', id]); }

    delete(id: string, e: Event) {
        e.stopPropagation();
        if (!confirm('Supprimer ce terrain ?')) return;
        this.terrainService.delete(id).pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
    }
}
