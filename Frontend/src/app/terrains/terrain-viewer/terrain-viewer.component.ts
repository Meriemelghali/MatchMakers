import {
    Component, Input, Output, EventEmitter,
    OnChanges, AfterViewInit, OnDestroy,
    ViewChild, ElementRef, SimpleChanges, NgZone
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// ─── Surface catalogue ────────────────────────────────────────────────────────
export interface SurfaceOption { key: string; label: string; hex: string; color: number; }

export const SURFACE_OPTIONS: SurfaceOption[] = [
    { key: 'GAZON_NATUREL',     label: 'Gazon naturel',    hex: '#2d7a2d', color: 0x2d7a2d },
    { key: 'GAZON_SYNTHETIQUE', label: 'Gazon synthétique', hex: '#1a9a1a', color: 0x1a9a1a },
    { key: 'PARQUET',           label: 'Parquet',           hex: '#c4834a', color: 0xc4834a },
    { key: 'BETON',             label: 'Béton',             hex: '#888888', color: 0x888888 },
    { key: 'TERRE_BATTUE',      label: 'Terre battue',      hex: '#c84b1e', color: 0xc84b1e },
    { key: 'TARTAN',            label: 'Tartan',            hex: '#b01e3a', color: 0xb01e3a },
];

// ─── Field presets ────────────────────────────────────────────────────────────
interface FieldPreset { w: number; l: number; label: string; }

const FIELD_PRESETS: Record<string, FieldPreset> = {
    FOOTBALL:   { w: 32, l: 50, label: 'Football' },
    FUTSAL:     { w: 18, l: 36, label: 'Futsal' },
    BASKETBALL: { w: 14, l: 26, label: 'Basketball' },
    TENNIS:     { w: 10, l: 22, label: 'Tennis' },
    VOLLEYBALL: { w: 9,  l: 18, label: 'Volleyball' },
    PADEL:      { w: 10, l: 20, label: 'Padel' },
    RUGBY:      { w: 34, l: 54, label: 'Rugby' },
    HANDBALL:   { w: 18, l: 36, label: 'Handball' },
};

const ROWS_TO_CAP = [0, 300, 1000, 3000, 8000, 20000];

// ─── Component ────────────────────────────────────────────────────────────────
@Component({
    selector: 'app-terrain-viewer',
    templateUrl: './terrain-viewer.component.html',
    styleUrls: ['./terrain-viewer.component.css']
})
export class TerrainViewerComponent implements AfterViewInit, OnChanges, OnDestroy {

    // ── Inputs from parent form ───────────────────────────────────────────────
    @Input() sportType: string = 'FOOTBALL';
    @Input() surface:   string = 'GAZON_NATUREL';
    @Input() capacite:  number | null = null;
    @Input() eclairage: boolean = false;

    // ── Outputs back to parent form ───────────────────────────────────────────
    @Output() surfaceChange  = new EventEmitter<string>();
    @Output() capaciteChange = new EventEmitter<number | null>();
    @Output() eclairageChange = new EventEmitter<boolean>();

    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    // ── Local viewer state (viewer owns these, syncs with inputs) ─────────────
    vSurface   = 'GAZON_NATUREL';
    vRows      = 0;
    vEclairage = false;

    // ── UI state ──────────────────────────────────────────────────────────────
    surfaceOptions = SURFACE_OPTIONS;
    hoveredLabel   = '';
    rowsDots       = [0, 1, 2, 3, 4];

    get fieldLabel():    string { return FIELD_PRESETS[this.sportType]?.label ?? this.sportType; }
    get surfaceLabel():  string { return SURFACE_OPTIONS.find(s => s.key === this.vSurface)?.label ?? ''; }
    get surfaceHex():    string { return SURFACE_OPTIONS.find(s => s.key === this.vSurface)?.hex ?? '#2d7a2d'; }
    get standLabel():    string {
        if (this.vRows === 0) return 'Aucun gradin';
        const cap = ROWS_TO_CAP[this.vRows];
        return `${this.vRows} rang${this.vRows > 1 ? 's' : ''} · ~${cap.toLocaleString('fr')} pl.`;
    }

    // ── Three.js internals ────────────────────────────────────────────────────
    private renderer!: THREE.WebGLRenderer;
    private scene!:    THREE.Scene;
    private camera!:   THREE.PerspectiveCamera;
    private controls!: OrbitControls;
    private animId?:   number;
    private ready =    false;

    private raycaster   = new THREE.Raycaster();
    private mouse       = new THREE.Vector2();
    private hoverables: Array<{ mesh: THREE.Mesh; type: string }> = [];
    private hoveredMesh: THREE.Mesh | null = null;
    private mdPos = { x: 0, y: 0 };

    private onMM!: (e: MouseEvent) => void;
    private onMD!: (e: MouseEvent) => void;
    private onCK!: (e: MouseEvent) => void;
    private ro?: ResizeObserver;

    constructor(private zone: NgZone) {}

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    ngAfterViewInit() {
        this.syncFromInputs();
        this.zone.runOutsideAngular(() => {
            this.initScene();
            this.rebuild();
            this.setupMouse();
            this.loop();
        });
        this.ready = true;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (!this.ready) return;
        this.syncFromInputs();
        this.zone.runOutsideAngular(() => this.rebuild());
    }

    ngOnDestroy() {
        cancelAnimationFrame(this.animId!);
        this.ro?.disconnect();
        this.controls?.dispose();
        this.renderer?.dispose();
        const c = this.canvasRef?.nativeElement;
        if (c) {
            c.removeEventListener('mousemove', this.onMM);
            c.removeEventListener('mousedown', this.onMD);
            c.removeEventListener('click',     this.onCK);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Creator bar actions (called from template — always in Angular zone)
    // ─────────────────────────────────────────────────────────────────────────

    setSurface(key: string) {
        this.vSurface = key;
        this.zone.runOutsideAngular(() => this.rebuild());
        this.surfaceChange.emit(key);
    }

    changeRows(delta: number) {
        this.vRows = Math.max(0, Math.min(5, this.vRows + delta));
        this.zone.runOutsideAngular(() => this.rebuild());
        this.capaciteChange.emit(ROWS_TO_CAP[this.vRows] || null);
    }

    toggleLighting() {
        this.vEclairage = !this.vEclairage;
        this.zone.runOutsideAngular(() => this.rebuild());
        this.eclairageChange.emit(this.vEclairage);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private syncFromInputs() {
        this.vSurface   = this.surface;
        this.vEclairage = this.eclairage;
        const cap = this.capacite ?? 0;
        this.vRows = cap <= 0 ? 0 : cap <= 300 ? 1 : cap <= 1000 ? 2 : cap <= 3000 ? 3 : cap <= 8000 ? 4 : 5;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Three.js scene
    // ─────────────────────────────────────────────────────────────────────────

    private initScene() {
        const c = this.canvasRef.nativeElement;
        const w = c.clientWidth  || 600;
        const h = c.clientHeight || 320;

        this.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
        this.renderer.setSize(w, h, false);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1f28);
        this.scene.fog        = new THREE.FogExp2(0x1a1f28, 0.011);

        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
        this.camera.position.set(0, 48, 68);
        this.camera.lookAt(0, 0, 0);

        this.controls = new OrbitControls(this.camera, c);
        this.controls.enableDamping   = true;
        this.controls.dampingFactor   = 0.06;
        this.controls.minDistance     = 18;
        this.controls.maxDistance     = 150;
        this.controls.maxPolarAngle   = Math.PI / 2.1;
        this.controls.autoRotate      = true;
        this.controls.autoRotateSpeed = 0.5;
        c.addEventListener('pointerdown', () => { this.controls.autoRotate = false; });

        // Fixed lights (never removed)
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        ambient.userData['fixed'] = true;
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xfff8ee, 1.3);
        sun.position.set(30, 60, 40);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = sun.shadow.camera.bottom = -90;
        sun.shadow.camera.right = sun.shadow.camera.top   =  90;
        sun.userData['fixed'] = true;
        this.scene.add(sun);

        // Responsive resize
        this.ro = new ResizeObserver(() => {
            const w2 = c.clientWidth, h2 = c.clientHeight;
            this.renderer.setSize(w2, h2, false);
            this.camera.aspect = w2 / h2;
            this.camera.updateProjectionMatrix();
        });
        this.ro.observe(c.parentElement!);
    }

    private rebuild() {
        this.hoverables  = [];
        this.hoveredMesh = null;

        // Remove all tagged objects, keep fixed lights
        this.scene.children
            .filter(o => o.userData['t'])
            .forEach(o => {
                if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
                this.scene.remove(o);
            });

        const p    = FIELD_PRESETS[this.sportType] ?? FIELD_PRESETS['FOOTBALL'];
        const surf = SURFACE_OPTIONS.find(s => s.key === this.vSurface) ?? SURFACE_OPTIONS[0];

        this.addGround(p);
        this.addField(p, surf.color);
        this.addMarkings(p);
        this.addBleachers(p, this.vRows);
        if (this.vEclairage) this.addFloodlights(p);
    }

    // ── Ground ────────────────────────────────────────────────────────────────
    private addGround(p: FieldPreset) {
        const m = this.mesh(
            new THREE.BoxGeometry(p.w + 32, 0.4, p.l + 32),
            new THREE.MeshLambertMaterial({ color: 0x1c2230 })
        );
        m.position.y = -0.2;
        m.receiveShadow = true;
    }

    // ── Field surface ─────────────────────────────────────────────────────────
    private addField(p: FieldPreset, surfColor: number) {
        // Border strip
        const b = this.mesh(
            new THREE.BoxGeometry(p.w + 5, 0.2, p.l + 5),
            new THREE.MeshLambertMaterial({ color: 0x22293a })
        );
        b.position.y = 0.1;

        // Main surface (hoverable → cycles surface on click)
        const mat = new THREE.MeshLambertMaterial({ color: surfColor });
        const s   = this.mesh(new THREE.BoxGeometry(p.w, 0.25, p.l), mat);
        s.position.y   = 0.13;
        s.receiveShadow = true;
        this.hoverables.push({ mesh: s, type: 'field' });

        // Grass stripes
        if (this.vSurface === 'GAZON_NATUREL' || this.vSurface === 'GAZON_SYNTHETIQUE') {
            const dark = new THREE.Color(surfColor).multiplyScalar(0.86).getHex();
            const n    = Math.floor(p.l / 5);
            for (let i = 0; i < n; i++) {
                if (i % 2 !== 0) continue;
                const stripe = this.mesh(
                    new THREE.BoxGeometry(p.w, 0.01, 5),
                    new THREE.MeshLambertMaterial({ color: dark })
                );
                stripe.position.set(0, 0.265, -p.l / 2 + 2.5 + i * 5);
            }
        }
    }

    // ── Markings dispatcher ───────────────────────────────────────────────────
    private addMarkings(p: FieldPreset) {
        const s = this.sportType;
        if (['FOOTBALL', 'FUTSAL', 'RUGBY', 'HANDBALL'].includes(s)) this.mRect(p);
        else if (s === 'BASKETBALL')  this.mBasketball(p);
        else if (s === 'TENNIS')      this.mTennis(p);
        else if (s === 'VOLLEYBALL')  this.mVolleyball(p);
        else if (s === 'PADEL')       this.mPadel(p);
    }

    // ── Mark helpers ──────────────────────────────────────────────────────────
    private ln(x1: number, z1: number, x2: number, z2: number, t = 0.12, c = 0xffffff) {
        const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
        if (len < 0.01) return;
        const m = this.mesh(new THREE.BoxGeometry(t, 0.04, len), new THREE.MeshBasicMaterial({ color: c }));
        m.position.set((x1 + x2) / 2, 0.28, (z1 + z2) / 2);
        m.rotation.y = Math.atan2(dx, dz);
    }
    private circ(x: number, z: number, r: number, c = 0xffffff, segs = 48) {
        const pts = Array.from({ length: segs + 1 }, (_, i) => {
            const a = (i / segs) * Math.PI * 2;
            return new THREE.Vector3(x + Math.cos(a) * r, 0.285, z + Math.sin(a) * r);
        });
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: c }));
        l.userData['t'] = true;
        this.scene.add(l);
    }
    private box(x1: number, z1: number, x2: number, z2: number, c = 0xffffff) {
        this.ln(x1, z1, x2, z1, 0.12, c); this.ln(x2, z1, x2, z2, 0.12, c);
        this.ln(x2, z2, x1, z2, 0.12, c); this.ln(x1, z2, x1, z1, 0.12, c);
    }
    private dot(x: number, z: number) {
        const m = this.mesh(new THREE.CircleGeometry(0.2, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.29, z);
    }

    // ── Sport markings ────────────────────────────────────────────────────────
    private mRect(p: FieldPreset) {
        const hw = p.w / 2, hl = p.l / 2;
        this.box(-hw, -hl, hw, hl);
        this.ln(-hw, 0, hw, 0);
        this.circ(0, 0, p.w * 0.13);

        const s = this.sportType;
        if (s === 'FOOTBALL' || s === 'RUGBY') {
            const pa = p.w * 0.58, pd = p.l * 0.15, ga = p.w * 0.30, gd = p.l * 0.055;
            this.box(-pa / 2, -hl, pa / 2, -hl + pd);
            this.box(-pa / 2,  hl, pa / 2,  hl - pd);
            this.box(-ga / 2, -hl, ga / 2, -hl + gd);
            this.box(-ga / 2,  hl, ga / 2,  hl - gd);
            this.dot(0, -hl + p.l * 0.17);
            this.dot(0,  hl - p.l * 0.17);
            this.goal(0, -hl, p.w * 0.18, 2.4);
            this.goal(0,  hl, p.w * 0.18, 2.4, true);
        }
        if (s === 'HANDBALL') {
            this.circ(0, -hl, p.l * 0.17);
            this.circ(0,  hl, p.l * 0.17);
            this.goal(0, -hl, p.w * 0.17, 1.2);
            this.goal(0,  hl, p.w * 0.17, 1.2, true);
        }
    }

    private mBasketball(p: FieldPreset) {
        const hw = p.w / 2, hl = p.l / 2;
        this.box(-hw, -hl, hw, hl);
        this.ln(-hw, 0, hw, 0);
        this.circ(0, 0, p.w * 0.20);
        const kw = p.w * 0.38, kl = p.l * 0.24;
        this.box(-kw / 2, -hl, kw / 2, -hl + kl);
        this.box(-kw / 2,  hl, kw / 2,  hl - kl);
        this.circ(0, -hl + kl, kw * 0.38);
        this.circ(0,  hl - kl, kw * 0.38);
        // 3-point arcs
        const r3 = p.w * 0.46;
        const arc = (zBase: number, dir: number) => {
            const pts = Array.from({ length: 33 }, (_, i) => {
                const a = (i / 32) * Math.PI;
                return new THREE.Vector3(Math.cos(a + Math.PI) * r3, 0.285, zBase + Math.sin(a) * r3 * dir);
            });
            const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff }));
            l.userData['t'] = true; this.scene.add(l);
        };
        arc(-hl, 1); arc(hl, -1);
        this.basket(0, -hl + 0.8); this.basket(0, hl - 0.8, true);
    }

    private mTennis(p: FieldPreset) {
        const hw = p.w / 2, hl = p.l / 2, si = hw * 0.77, sl = hl * 0.46;
        this.box(-hw, -hl, hw, hl);
        this.ln(-si, -hl, -si, hl); this.ln(si, -hl, si, hl);
        this.ln(-hw, 0, hw, 0);
        this.ln(-si, -sl, si, -sl); this.ln(-si, sl, si, sl);
        this.ln(0, -sl, 0, sl);
        this.net(p);
    }

    private mVolleyball(p: FieldPreset) {
        const hw = p.w / 2, hl = p.l / 2;
        this.box(-hw, -hl, hw, hl);
        this.ln(-hw, 0, hw, 0);
        this.ln(-hw, -hl * 0.34, hw, -hl * 0.34);
        this.ln(-hw,  hl * 0.34, hw,  hl * 0.34);
        this.net(p);
    }

    private mPadel(p: FieldPreset) {
        const hw = p.w / 2, hl = p.l / 2;
        this.box(-hw, -hl, hw, hl);
        this.ln(-hw, 0, hw, 0);
        this.ln(-hw, -hl * 0.38, hw, -hl * 0.38);
        this.ln(-hw,  hl * 0.38, hw,  hl * 0.38);
        this.ln(0, -hl * 0.38, 0, hl * 0.38);
        // Glass enclosure
        const wMat = new THREE.MeshLambertMaterial({ color: 0x7ab0dd, transparent: true, opacity: 0.22 });
        const walls = [
            { g: new THREE.BoxGeometry(p.w, 1.8, 0.07), p: new THREE.Vector3(0, 1.17, -hl) },
            { g: new THREE.BoxGeometry(p.w, 1.8, 0.07), p: new THREE.Vector3(0, 1.17,  hl) },
            { g: new THREE.BoxGeometry(0.07, 1.8, p.l), p: new THREE.Vector3(-hw, 1.17, 0) },
            { g: new THREE.BoxGeometry(0.07, 1.8, p.l), p: new THREE.Vector3( hw, 1.17, 0) },
        ];
        walls.forEach(({ g, p: pos }) => {
            const m = this.mesh(g, wMat);
            m.position.copy(pos);
        });
        this.net(p);
    }

    // ── Structural helpers ────────────────────────────────────────────────────
    private goal(x: number, z: number, w: number, h: number, flip = false) {
        const mat  = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const dir  = flip ? -1 : 1;
        [-w / 2, w / 2].forEach(dx => {
            const post = this.mesh(new THREE.CylinderGeometry(0.07, 0.07, h, 6), mat);
            post.position.set(x + dx, h / 2 + 0.28, z);
        });
        const bar = this.mesh(new THREE.CylinderGeometry(0.06, 0.06, w, 6), mat);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(x, h + 0.28, z);
        const back = this.mesh(new THREE.CylinderGeometry(0.05, 0.05, w, 6), mat);
        back.rotation.z = Math.PI / 2;
        back.position.set(x, h * 0.35 + 0.28, z + dir * 1.2);
    }

    private basket(x: number, z: number, flip = false) {
        const mat = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
        const bb  = this.mesh(new THREE.BoxGeometry(1.8, 1.1, 0.08), mat);
        bb.position.set(x, 2.9 + 0.28, z);
        this.circ(x, z + (flip ? -0.45 : 0.45), 0.23, 0xff6600);
    }

    private net(p: FieldPreset) {
        const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        [-p.w / 2 - 0.3, p.w / 2 + 0.3].forEach(px => {
            const post = this.mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.5, 6), mat);
            post.position.set(px, 1.25 + 0.28, 0);
        });
        const tape = this.mesh(new THREE.BoxGeometry(p.w + 0.6, 0.08, 0.08), mat);
        tape.position.set(0, 2.5 + 0.28, 0);
    }

    // ── Bleachers ─────────────────────────────────────────────────────────────
    private addBleachers(p: FieldPreset, rows: number) {
        if (rows <= 0) return;
        const rW = 1.45, rH = 0.9;
        const seatColors = [0xe8500a, 0x2255cc, 0xbbbbbb, 0x228822, 0xaa1111];

        for (let r = 0; r < rows; r++) {
            const xOff = p.w / 2 + 2.5 + r * rW;
            const zOff = p.l / 2 + 2.5 + r * rW;
            const y    = 0.28 + r * rH * 0.55;
            const sc   = seatColors[r % seatColors.length];
            const bc   = new THREE.Color(sc).multiplyScalar(0.38).getHex();
            const zLen = p.l + (rows > 1 ? 3 + r * 2.5 : 0);

            // Long sides
            for (const xPos of [-xOff, xOff]) {
                const stand = this.mesh(new THREE.BoxGeometry(rW, rH * 0.55, zLen), new THREE.MeshLambertMaterial({ color: bc }));
                stand.position.set(xPos, y, 0);
                stand.castShadow = true;
                this.hoverables.push({ mesh: stand, type: 'bleachers' });

                const seats = this.mesh(new THREE.BoxGeometry(rW * 0.72, 0.09, zLen - 0.4), new THREE.MeshLambertMaterial({ color: sc }));
                seats.position.set(xPos > 0 ? xPos - rW * 0.18 : xPos + rW * 0.18, y + rH * 0.28, 0);
                seats.rotation.z = xPos > 0 ? -0.27 : 0.27;
            }

            // Short ends (if ≥ 2 rows)
            if (rows >= 2) {
                const xSpan = p.w + (r + 1) * rW * 2 + 4.5;
                for (const zPos of [-zOff, zOff]) {
                    const stand = this.mesh(new THREE.BoxGeometry(xSpan, rH * 0.55, rW), new THREE.MeshLambertMaterial({ color: bc }));
                    stand.position.set(0, y, zPos);
                    stand.castShadow = true;
                    this.hoverables.push({ mesh: stand, type: 'bleachers' });

                    const seats = this.mesh(new THREE.BoxGeometry(xSpan - 0.4, 0.09, rW * 0.72), new THREE.MeshLambertMaterial({ color: sc }));
                    seats.position.set(0, y + rH * 0.28, zPos > 0 ? zPos - rW * 0.18 : zPos + rW * 0.18);
                    seats.rotation.x = zPos > 0 ? 0.27 : -0.27;
                }
            }
        }
    }

    // ── Floodlights ───────────────────────────────────────────────────────────
    private addFloodlights(p: FieldPreset) {
        const poleMat  = new THREE.MeshLambertMaterial({ color: 0x9aadbb });
        const headMat  = new THREE.MeshLambertMaterial({ color: 0xfffff0, emissive: new THREE.Color(0xffff88), emissiveIntensity: 0.7 });
        const corners  = [[-p.w / 2 - 7, p.l / 2 + 7], [p.w / 2 + 7, p.l / 2 + 7],
                          [-p.w / 2 - 7, -p.l / 2 - 7], [p.w / 2 + 7, -p.l / 2 - 7]];

        corners.forEach(([cx, cz]) => {
            const pole = this.mesh(new THREE.CylinderGeometry(0.18, 0.26, 14, 8), poleMat);
            pole.position.set(cx, 7, cz);
            pole.castShadow = true;
            this.hoverables.push({ mesh: pole, type: 'lights' });

            const hx = cx > 0 ? cx - 1.4 : cx + 1.4, hz = cz > 0 ? cz - 1.4 : cz + 1.4;
            const head = this.mesh(new THREE.BoxGeometry(2.2, 0.38, 1.4), headMat);
            head.position.set(hx, 14.3, hz);
            head.lookAt(new THREE.Vector3(0, 14.3, 0));

            const spot = new THREE.SpotLight(0xfffde7, 3, 100, Math.PI / 5, 0.35);
            spot.position.set(hx, 14, hz);
            spot.target.position.set(0, 0, 0);
            spot.castShadow = true;
            spot.userData['t'] = true;
            this.scene.add(spot);
            this.scene.add(spot.target);
        });
    }

    // ── Mouse / raycasting ────────────────────────────────────────────────────
    private setupMouse() {
        const c = this.canvasRef.nativeElement;

        this.onMD = (e: MouseEvent) => { this.mdPos = { x: e.clientX, y: e.clientY }; };
        this.onMM = (e: MouseEvent) => this.onMouseMove(e);
        this.onCK = (e: MouseEvent) => this.onCanvasClick(e);

        c.addEventListener('mousedown', this.onMD);
        c.addEventListener('mousemove', this.onMM);
        c.addEventListener('click',     this.onCK);
    }

    private onMouseMove(e: MouseEvent) {
        const c    = this.canvasRef.nativeElement;
        const rect = c.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObjects(this.hoverables.map(h => h.mesh), false);

        if (hits.length) {
            const hitMesh = hits[0].object as THREE.Mesh;
            if (hitMesh !== this.hoveredMesh) {
                this.clearHover();
                this.hoveredMesh = hitMesh;
                const mat = hitMesh.material as THREE.MeshLambertMaterial;
                if (mat?.emissive) { mat.emissive.set(0xaaaaaa); mat.emissiveIntensity = 0.28; }
                const type = this.hoverables.find(h => h.mesh === hitMesh)?.type ?? '';
                const labels: Record<string, string> = {
                    field:    'Cliquer pour changer la surface',
                    bleachers:'Cliquer pour ajouter un rang',
                    lights:   'Cliquer pour basculer l\'éclairage'
                };
                this.zone.run(() => { this.hoveredLabel = labels[type] ?? ''; });
            }
            c.style.cursor = 'pointer';
        } else {
            this.clearHover();
            if (this.hoveredLabel) this.zone.run(() => { this.hoveredLabel = ''; });
            c.style.cursor = '';
        }
    }

    private clearHover() {
        if (!this.hoveredMesh) return;
        const mat = this.hoveredMesh.material as THREE.MeshLambertMaterial;
        if (mat?.emissive) { mat.emissive.set(0x000000); mat.emissiveIntensity = 0; }
        this.hoveredMesh = null;
    }

    private onCanvasClick(e: MouseEvent) {
        if (Math.abs(e.clientX - this.mdPos.x) > 5 || Math.abs(e.clientY - this.mdPos.y) > 5) return;
        if (!this.hoveredMesh) return;
        const found = this.hoverables.find(h => h.mesh === this.hoveredMesh);
        if (!found) return;

        this.zone.run(() => {
            if (found.type === 'field') {
                // Cycle to next surface
                const idx = SURFACE_OPTIONS.findIndex(s => s.key === this.vSurface);
                this.setSurface(SURFACE_OPTIONS[(idx + 1) % SURFACE_OPTIONS.length].key);
            } else if (found.type === 'bleachers') {
                this.changeRows(this.vRows < 5 ? 1 : -5); // add row, reset to 0 at max
            } else if (found.type === 'lights') {
                this.toggleLighting();
            }
        });
    }

    // ── Render loop ───────────────────────────────────────────────────────────
    private loop() {
        this.animId = requestAnimationFrame(() => this.loop());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // ── Mesh factory ──────────────────────────────────────────────────────────
    private mesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
        const m = new THREE.Mesh(geo, mat);
        m.userData['t'] = true;
        this.scene.add(m);
        return m;
    }
}
