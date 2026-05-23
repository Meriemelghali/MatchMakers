import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TerrainService } from '../services/terrain.service';
import { SportType, SurfaceType } from '../models/terrain.model';

interface VenueResult {
    position: google.maps.LatLngLiteral;
    name: string;
    vicinity?: string;
    placeId?: string;
}

@Component({
    selector: 'app-terrain-form',
    templateUrl: './terrain-form.component.html',
    styleUrls: ['./terrain-form.component.css']
})
export class TerrainFormComponent implements OnInit, AfterViewChecked, OnDestroy {
    private destroy$ = new Subject<void>();
    private autocompleteInitialized = false;
    private placesService?: google.maps.places.PlacesService;
    private autocomplete?: google.maps.places.Autocomplete;

    @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

    form!: FormGroup;
    isEdit = false;
    terrainId: string | null = null;
    loading = false;
    submitting = false;
    error = '';
    locating = false;

    sports: SportType[]     = ['FOOTBALL', 'BASKETBALL', 'TENNIS', 'VOLLEYBALL', 'FUTSAL', 'PADEL', 'RUGBY', 'HANDBALL'];
    surfaces: SurfaceType[] = ['GAZON_NATUREL', 'GAZON_SYNTHETIQUE', 'PARQUET', 'BETON', 'TERRE_BATTUE', 'TARTAN'];

    // ── Google Maps state ─────────────────────────────────────────────────────
    mapCenter: google.maps.LatLngLiteral = { lat: 36.8189, lng: 10.1658 };
    mapZoom = 12;
    mapOptions: google.maps.MapOptions = {
        mapTypeId: 'roadmap',
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: [
            { elementType: 'geometry',                                              stylers: [{ color: '#1d2130' }] },
            { elementType: 'labels.text.fill',                                      stylers: [{ color: '#8a9bb0' }] },
            { elementType: 'labels.text.stroke',                                    stylers: [{ color: '#1a1f28' }] },
            { featureType: 'administrative',     elementType: 'geometry',           stylers: [{ color: '#2a3040' }] },
            { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9aa3b0' }] },
            { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c0cad8' }] },
            { featureType: 'poi',                                                   stylers: [{ visibility: 'off' }] },
            { featureType: 'road',               elementType: 'geometry',           stylers: [{ color: '#2a3040' }] },
            { featureType: 'road',               elementType: 'geometry.stroke',    stylers: [{ color: '#212529' }] },
            { featureType: 'road',               elementType: 'labels.text.fill',   stylers: [{ color: '#9aa3b0' }] },
            { featureType: 'road.highway',       elementType: 'geometry',           stylers: [{ color: '#3a4258' }] },
            { featureType: 'road.highway',       elementType: 'geometry.stroke',    stylers: [{ color: '#1f2635' }] },
            { featureType: 'road.highway',       elementType: 'labels.text.fill',   stylers: [{ color: '#b0bbc8' }] },
            { featureType: 'transit',                                               stylers: [{ visibility: 'off' }] },
            { featureType: 'water',              elementType: 'geometry',           stylers: [{ color: '#0d1117' }] },
            { featureType: 'water',              elementType: 'labels.text.fill',   stylers: [{ color: '#3d5473' }] }
        ]
    };
    markerPosition?: google.maps.LatLngLiteral;
    markerOptions: google.maps.MarkerOptions = { draggable: true };

    // ── Venue search state ────────────────────────────────────────────────────
    venueResults: VenueResult[] = [];
    selectedVenue: VenueResult | null = null;
    searchingVenues = false;

    get venueMarkerOptions(): google.maps.MarkerOptions {
        return {
            draggable: false,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#e8500a',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2.5
            }
        };
    }

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private terrainService: TerrainService,
        private zone: NgZone
    ) {}

    ngOnInit() {
        this.form = this.fb.group({
            nom:          ['', Validators.required],
            adresse:      ['', Validators.required],
            ville:        ['', Validators.required],
            latitude:     [null],
            longitude:    [null],
            typeSport:    ['', Validators.required],
            typeSurface:  ['', Validators.required],
            capacite:     [null],
            description:  [''],
            contact:      [''],
            prixParHeure: [null, Validators.min(0)],
            eclairage:    [false],
            vestiaires:   [false],
            parking:      [false],
            tribunes:     [false],
            bar:          [false]
        });

        this.terrainId = this.route.snapshot.paramMap.get('id');
        this.isEdit    = !!this.terrainId;

        if (this.isEdit) {
            this.loading = true;
            this.terrainService.getById(this.terrainId!).pipe(takeUntil(this.destroy$)).subscribe({
                next: t => {
                    this.form.patchValue(t);
                    this.loading = false;
                    if (t.latitude && t.longitude) {
                        this.setMarker(t.latitude, t.longitude);
                    }
                },
                error: () => { this.error = 'Terrain introuvable'; this.loading = false; }
            });
        }
    }

    // Initialise the autocomplete once the search input is in the DOM
    ngAfterViewChecked() {
        if (this.autocompleteInitialized || this.loading || !this.searchInput?.nativeElement) return;
        this.autocompleteInitialized = true;
        setTimeout(() => this.initAutocomplete(), 0);
    }

    ngOnDestroy() {
        if (this.autocomplete) {
            google.maps.event.clearInstanceListeners(this.autocomplete);
        }
        this.destroy$.next();
        this.destroy$.complete();
    }

    get f() { return this.form.controls; }
    get lat(): number | null { return this.form.value.latitude; }
    get lng(): number | null { return this.form.value.longitude; }

    // ── Autocomplete ──────────────────────────────────────────────────────────

    private initAutocomplete() {
        if (!this.searchInput?.nativeElement || this.autocomplete) return;

        this.autocomplete = new google.maps.places.Autocomplete(
            this.searchInput.nativeElement,
            { fields: ['geometry', 'name', 'place_id', 'vicinity'] }
        );

        this.autocomplete.addListener('place_changed', () => {
            this.zone.run(() => {
                const place = this.autocomplete!.getPlace();
                if (!place.geometry?.location) return;

                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                this.mapCenter    = { lat, lng };
                this.mapZoom      = 14;
                this.venueResults = [];
                this.selectedVenue = null;
                this.searchNearbyVenues(lat, lng);
            });
        });
    }

    // ── Nearby sports venue search ────────────────────────────────────────────

    private searchNearbyVenues(lat: number, lng: number) {
        this.searchingVenues = true;

        if (!this.placesService) {
            this.placesService = new google.maps.places.PlacesService(document.createElement('div'));
        }

        const location   = new google.maps.LatLng(lat, lng);
        const collected  = new Map<string, VenueResult>();
        let   pending    = 2;

        const onResults = (
            results: google.maps.places.PlaceResult[] | null,
            status:  google.maps.places.PlacesServiceStatus
        ) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                results
                    .filter(r => r.geometry?.location && r.place_id)
                    .forEach(r => {
                        if (!collected.has(r.place_id!)) {
                            collected.set(r.place_id!, {
                                position: {
                                    lat: r.geometry!.location!.lat(),
                                    lng: r.geometry!.location!.lng()
                                },
                                name:     r.name || '',
                                vicinity: r.vicinity,
                                placeId:  r.place_id
                            });
                        }
                    });
            }
            if (--pending === 0) {
                this.zone.run(() => {
                    this.searchingVenues = false;
                    this.venueResults    = Array.from(collected.values());
                });
            }
        };

        // Search 1: official stadiums
        this.placesService.nearbySearch({ location, radius: 5000, type: 'stadium' }, onResults);
        // Search 2: gyms / sports clubs (filtered by keyword)
        this.placesService.nearbySearch(
            { location, radius: 5000, keyword: 'sport terrain complexe club', type: 'gym' },
            onResults
        );
    }

    // ── Map interactions ──────────────────────────────────────────────────────

    onMapClick(event: google.maps.MapMouseEvent) {
        if (event.latLng) {
            this.setMarker(event.latLng.lat(), event.latLng.lng());
        }
    }

    onMarkerDragend(event: google.maps.MapMouseEvent) {
        if (event.latLng) {
            this.form.patchValue({
                latitude:  +event.latLng.lat().toFixed(6),
                longitude: +event.latLng.lng().toFixed(6)
            });
            this.markerPosition = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        }
    }

    private setMarker(lat: number, lng: number) {
        this.markerPosition = { lat, lng };
        this.mapCenter      = { lat, lng };
        this.form.patchValue({
            latitude:  +lat.toFixed(6),
            longitude: +lng.toFixed(6)
        });
    }

    // ── Venue panel ───────────────────────────────────────────────────────────

    selectVenue(venue: VenueResult) {
        this.selectedVenue = this.selectedVenue?.placeId === venue.placeId ? null : venue;
        if (this.selectedVenue) {
            this.mapCenter = venue.position;
            this.mapZoom   = Math.max(this.mapZoom, 15);
        }
    }

    useVenueLocation(venue: VenueResult, event: Event) {
        event.stopPropagation();
        this.setMarker(venue.position.lat, venue.position.lng);
        this.mapZoom = 17;
    }

    clearVenueResults() {
        this.venueResults  = [];
        this.selectedVenue = null;
        if (this.searchInput?.nativeElement) {
            this.searchInput.nativeElement.value = '';
        }
    }

    // ── Geolocation ───────────────────────────────────────────────────────────

    locateMe() {
        if (!navigator.geolocation) return;
        this.locating = true;
        navigator.geolocation.getCurrentPosition(
            pos => this.zone.run(() => {
                this.setMarker(pos.coords.latitude, pos.coords.longitude);
                this.mapZoom  = 16;
                this.locating = false;
            }),
            () => this.zone.run(() => { this.locating = false; })
        );
    }

    clearPin() {
        this.markerPosition = undefined;
        this.form.patchValue({ latitude: null, longitude: null });
    }

    // ── Form submit ───────────────────────────────────────────────────────────

    submit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting = true;
        const obs = this.isEdit
            ? this.terrainService.update(this.terrainId!, this.form.value)
            : this.terrainService.create(this.form.value);
        obs.pipe(takeUntil(this.destroy$)).subscribe({
            next: t   => this.router.navigate(['/terrains', t.id]),
            error: err => { this.error = err.error?.message || 'Une erreur est survenue'; this.submitting = false; }
        });
    }
}
