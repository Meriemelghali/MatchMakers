import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TerrainService } from '../services/terrain.service';
import { SportType, SurfaceType } from '../models/terrain.model';
import * as L from 'leaflet';

// Fix Leaflet default marker icon paths broken by webpack
const iconDefault = L.icon({
    iconUrl:       'assets/leaflet/marker-icon.png',
    iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
    shadowUrl:     'assets/leaflet/marker-shadow.png',
    iconSize:    [25, 41],
    iconAnchor:  [12, 41],
    popupAnchor: [1, -34],
    shadowSize:  [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
    selector: 'app-terrain-form',
    templateUrl: './terrain-form.component.html',
    styleUrls: ['./terrain-form.component.css']
})
export class TerrainFormComponent implements OnInit, AfterViewInit, OnDestroy {
    private destroy$ = new Subject<void>();

    @ViewChild('mapEl') mapEl!: ElementRef;

    form!: FormGroup;
    isEdit = false;
    terrainId: string | null = null;
    loading = false;
    submitting = false;
    error = '';

    sports: SportType[]   = ['FOOTBALL', 'BASKETBALL', 'TENNIS', 'VOLLEYBALL', 'FUTSAL', 'PADEL', 'RUGBY', 'HANDBALL'];
    surfaces: SurfaceType[] = ['GAZON_NATUREL', 'GAZON_SYNTHETIQUE', 'PARQUET', 'BETON', 'TERRE_BATTUE', 'TARTAN'];

    private map!: L.Map;
    private marker?: L.Marker;
    locating = false;

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private terrainService: TerrainService,
        private zone: NgZone
    ) {}

    ngOnInit() {
        this.form = this.fb.group({
            nom:         ['', Validators.required],
            adresse:     ['', Validators.required],
            ville:       ['', Validators.required],
            latitude:    [null],
            longitude:   [null],
            typeSport:   ['', Validators.required],
            typeSurface: ['', Validators.required],
            capacite:    [null],
            description: [''],
            contact:     [''],
            prixParHeure:[null, Validators.min(0)],
            eclairage:   [false],
            vestiaires:  [false],
            parking:     [false],
            tribunes:    [false],
            bar:         [false]
        });

        this.terrainId = this.route.snapshot.paramMap.get('id');
        this.isEdit    = !!this.terrainId;

        if (this.isEdit) {
            this.loading = true;
            this.terrainService.getById(this.terrainId!).pipe(takeUntil(this.destroy$)).subscribe({
                next: t => {
                    this.form.patchValue(t);
                    this.loading = false;
                    // Init map now that the *ngIf="!loading" block is about to render
                    setTimeout(() => {
                        this.initMap();
                        setTimeout(() => {
                            this.map?.invalidateSize();
                            if (t.latitude && t.longitude) {
                                this.setMarker(t.latitude!, t.longitude!, false);
                            }
                        }, 200);
                    }, 50);
                },
                error: () => { this.error = 'Terrain introuvable'; this.loading = false; }
            });
        }
    }

    ngAfterViewInit() {
        if (this.isEdit) return; // edit mode inits map after data loads
        setTimeout(() => {
            this.initMap();
            setTimeout(() => this.map?.invalidateSize(), 200);
        }, 150);
    }

    ngOnDestroy() {
        window.removeEventListener('resize', this.onResize);
        this.map?.remove();
        this.destroy$.next();
        this.destroy$.complete();
    }

    get f() { return this.form.controls; }

    get lat(): number | null { return this.form.value.latitude; }
    get lng(): number | null { return this.form.value.longitude; }

    private onResize = () => this.map?.invalidateSize();

    private initMap() {
        if (!this.mapEl?.nativeElement) return;

        // Default center: Tunisia
        const defaultLat = this.form.value.latitude ?? 36.8189;
        const defaultLng = this.form.value.longitude ?? 10.1658;

        this.map = L.map(this.mapEl.nativeElement, { zoomControl: true }).setView([defaultLat, defaultLng], 12);
        window.addEventListener('resize', this.onResize);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(this.map);

        // Place marker if coords already exist
        if (this.form.value.latitude && this.form.value.longitude) {
            this.setMarker(this.form.value.latitude, this.form.value.longitude, false);
        }

        // Click to place marker
        this.map.on('click', (e: L.LeafletMouseEvent) => {
            this.zone.run(() => this.setMarker(e.latlng.lat, e.latlng.lng, true));
        });
    }

    private setMarker(lat: number, lng: number, updateForm: boolean) {
        const latlng = L.latLng(lat, lng);
        if (this.marker) {
            this.marker.setLatLng(latlng);
        } else {
            this.marker = L.marker(latlng, { draggable: true }).addTo(this.map);
            this.marker.on('dragend', (e: any) => {
                const pos = e.target.getLatLng();
                this.zone.run(() => this.form.patchValue({
                    latitude:  +pos.lat.toFixed(6),
                    longitude: +pos.lng.toFixed(6)
                }));
            });
        }
        if (updateForm) {
            this.form.patchValue({
                latitude:  +lat.toFixed(6),
                longitude: +lng.toFixed(6)
            });
        }
        this.map.panTo(latlng);
    }

    locateMe() {
        if (!navigator.geolocation) return;
        this.locating = true;
        navigator.geolocation.getCurrentPosition(
            pos => this.zone.run(() => {
                this.setMarker(pos.coords.latitude, pos.coords.longitude, true);
                this.map.setView([pos.coords.latitude, pos.coords.longitude], 16);
                this.locating = false;
            }),
            () => this.zone.run(() => { this.locating = false; })
        );
    }

    clearPin() {
        if (this.marker) { this.map.removeLayer(this.marker); this.marker = undefined; }
        this.form.patchValue({ latitude: null, longitude: null });
    }

    submit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting = true;
        const obs = this.isEdit
            ? this.terrainService.update(this.terrainId!, this.form.value)
            : this.terrainService.create(this.form.value);
        obs.pipe(takeUntil(this.destroy$)).subscribe({
            next: t => this.router.navigate(['/terrains', t.id]),
            error: err => { this.error = err.error?.message || 'Une erreur est survenue'; this.submitting = false; }
        });
    }
}
