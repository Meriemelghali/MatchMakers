import {
  Component, OnDestroy, AfterViewInit, ElementRef, ViewChild, NgZone
} from '@angular/core';
import * as THREE from 'three';
import { MatchEvent } from '../models/match.model';

@Component({
  selector: 'app-stadium-reaction',
  templateUrl: './stadium-reaction.component.html',
  styleUrls: ['./stadium-reaction.component.css']
})
export class StadiumReactionComponent implements AfterViewInit, OnDestroy {

  @ViewChild('threeCanvas')   private canvasRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('particleCanvas') private pCanvasRef!: ElementRef<HTMLCanvasElement>;

  visible     = false;
  badgeVisible = false;
  currentEvent: MatchEvent | null = null;
  currentTeam = '';
  currentScore1 = 0;
  currentScore2 = 0;

  private renderer!: THREE.WebGLRenderer;
  private scene!:    THREE.Scene;
  private camera!:   THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  private floodlights: THREE.SpotLight[] = [];
  private crowdPoints!: THREE.Points;
  private crowdPositions!: Float32Array;

  private shakeIntensity = 0;
  private fogTarget  = new THREE.Color(0x000000);
  private fogCurrent = new THREE.Color(0x000000);
  private lightTarget: { color: THREE.Color; intensity: number } = {
    color: new THREE.Color(0xfff5e0), intensity: 2.5
  };

  private rafHandle  = 0;
  private pRafHandle = 0;
  private dismissTimer: any;
  private audioCtx: AudioContext | null = null;

  private particles: Particle[] = [];

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.initThree();
    this.ngZone.runOutsideAngular(() => this.loop());
  }

  // ── Public API ────────────────────────────────────────────────

  trigger(event: MatchEvent, teamName: string, score1: number, score2: number) {
    clearTimeout(this.dismissTimer);
    this.badgeVisible    = false;
    this.currentEvent    = event;
    this.currentTeam     = teamName;
    this.currentScore1   = score1;
    this.currentScore2   = score2;

    // Small gap so Angular re-renders the badge content first
    setTimeout(() => {
      this.visible = true;
      setTimeout(() => { this.badgeVisible = true; }, 80);
      this.applyEffects(event);
      this.launchParticles(event);

      this.dismissTimer = setTimeout(() => {
        this.badgeVisible = false;
        setTimeout(() => { this.visible = false; }, 700);
      }, 4800);
    }, 30);
  }

  dismiss() {
    clearTimeout(this.dismissTimer);
    this.badgeVisible = false;
    setTimeout(() => { this.visible = false; }, 700);
  }

  // ── Three.js scene ────────────────────────────────────────────

  private initThree() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene  = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.016);

    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 300);
    this.camera.position.set(0, 30, 22);
    this.camera.lookAt(0, 0, 0);

    this.buildScene();
  }

  private buildScene() {
    // ── Pitch
    const pitchMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3a, roughness: 0.85 });
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(34, 22), pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // Pitch stripes
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x245e2c, roughness: 0.85 });
    for (let z = -10; z <= 10; z += 4) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(34, 2), stripeMat);
      s.rotation.x = -Math.PI / 2; s.position.set(0, 0.001, z);
      this.scene.add(s);
    }

    // Lines (white)
    const wMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    // Halfway line
    const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 22), wMat);
    hl.rotation.x = -Math.PI / 2; hl.position.y = 0.003;
    this.scene.add(hl);

    // Touchlines & goal lines
    const border = new THREE.Mesh(new THREE.EdgesGeometry(new THREE.BoxGeometry(34, 0, 22)), new THREE.LineBasicMaterial({ color: 0xffffff }));
    border.position.y = 0.003; this.scene.add(border);

    // Center circle
    const cc = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.85, 64), wMat);
    cc.rotation.x = -Math.PI / 2; cc.position.y = 0.003; this.scene.add(cc);

    // Center spot
    const cs = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), wMat);
    cs.rotation.x = -Math.PI / 2; cs.position.y = 0.003; this.scene.add(cs);

    // Penalty boxes
    [-15.5, 15.5].forEach(x => {
      const sign = x < 0 ? 1 : -1;
      const box = new THREE.Mesh(new THREE.EdgesGeometry(new THREE.BoxGeometry(0, 10.5, 12.5)), new THREE.LineBasicMaterial({ color: 0xffffff }));
      box.position.set(x + sign * 5.25 / 2, 0.003, 0);
      this.scene.add(box);
    });

    // Goal posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 });
    [-16.9, 16.9].forEach(x => {
      [-1.83, 1.83].forEach(z => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.44, 8), postMat);
        p.position.set(x, 1.22, z); p.castShadow = true; this.scene.add(p);
      });
      const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.73, 8), postMat);
      cb.rotation.z = Math.PI / 2; cb.position.set(x, 2.44, 0); this.scene.add(cb);
    });

    // ── Stands (4 sides, 3 tiers each)
    const standMat = new THREE.MeshStandardMaterial({ color: 0x12192a, roughness: 0.95 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x1c2540, roughness: 0.9 });
    const sides = [
      { axis: 'z', sign: -1, w: 40, h: 3, d: 3 },
      { axis: 'z', sign:  1, w: 40, h: 3, d: 3 },
      { axis: 'x', sign: -1, w: 3,  h: 3, d: 26 },
      { axis: 'x', sign:  1, w: 3,  h: 3, d: 26 },
    ] as const;

    sides.forEach(({ axis, sign, w, d }) => {
      for (let tier = 0; tier < 3; tier++) {
        const offset = (tier + 1) * 3.2 * sign;
        const mat = tier % 2 === 0 ? standMat : accentMat;
        const stand = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, d), mat);
        if (axis === 'z') {
          stand.position.set(0, tier * 1.5 + 0.7, 11 * sign + offset);
        } else {
          stand.position.set(17 * sign + offset, tier * 1.5 + 0.7, 0);
        }
        stand.castShadow = true;
        this.scene.add(stand);
      }
    });

    // ── Crowd (point cloud)
    const count = 3000;
    this.crowdPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const side = i % 4;
      let x = 0, y = 0, z = 0;
      const t = Math.random();
      if (side === 0) { x = (Math.random()-0.5)*38; z = -(11 + Math.random()*8.5); y = t*5+0.6; }
      else if (side === 1) { x = (Math.random()-0.5)*38; z =  (11 + Math.random()*8.5); y = t*5+0.6; }
      else if (side === 2) { x = -(17 + Math.random()*8.5); z = (Math.random()-0.5)*24; y = t*5+0.6; }
      else                 { x =  (17 + Math.random()*8.5); z = (Math.random()-0.5)*24; y = t*5+0.6; }
      this.crowdPositions[i*3]   = x;
      this.crowdPositions[i*3+1] = y;
      this.crowdPositions[i*3+2] = z;
    }
    const crowdGeo = new THREE.BufferGeometry();
    crowdGeo.setAttribute('position', new THREE.Float32BufferAttribute(this.crowdPositions, 3));
    const crowdMat = new THREE.PointsMaterial({ color: 0x8899cc, size: 0.28, sizeAttenuation: true, transparent: true, opacity: 0.7 });
    this.crowdPoints = new THREE.Points(crowdGeo, crowdMat);
    this.scene.add(this.crowdPoints);

    // ── Floodlights
    const flPos: [number, number, number][] = [[-16,12,-11],[16,12,-11],[-16,12,11],[16,12,11]];
    flPos.forEach(([lx, ly, lz]) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.16, ly, 6),
        new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6, roughness: 0.4 })
      );
      pole.position.set(lx, ly/2, lz);
      this.scene.add(pole);

      const spot = new THREE.SpotLight(0xfff8e8, 2.8, 70, Math.PI/4.8, 0.35, 1.1);
      spot.position.set(lx, ly, lz);
      spot.target.position.set(0, 0, 0);
      spot.castShadow = true;
      spot.shadow.mapSize.set(512, 512);
      this.scene.add(spot);
      this.scene.add(spot.target);
      this.floodlights.push(spot);
    });

    this.scene.add(new THREE.AmbientLight(0x0d1220, 4));
  }

  private loop() {
    this.rafHandle = requestAnimationFrame(() => this.loop());
    const t = this.clock.getElapsedTime();

    // Camera subtle orbit + shake
    if (this.shakeIntensity > 0.01) {
      this.camera.position.x = Math.sin(t * 20) * this.shakeIntensity * 0.35;
      this.camera.position.y = 30 + Math.cos(t * 17) * this.shakeIntensity * 0.25;
      this.shakeIntensity *= 0.90;
    } else {
      this.camera.position.x += (0 - this.camera.position.x) * 0.04;
      this.camera.position.y += (30 - this.camera.position.y) * 0.04;
    }

    // Gentle camera sway always
    this.camera.position.z = 22 + Math.sin(t * 0.4) * 0.6;
    this.camera.lookAt(0, 0, 0);

    // Fog color tween
    this.fogCurrent.lerp(this.fogTarget, 0.04);
    (this.scene.fog as THREE.FogExp2).color.copy(this.fogCurrent);
    this.renderer.setClearColor(this.fogCurrent, 1);

    // Floodlight pulse + tween to target
    this.floodlights.forEach((l, i) => {
      const phase = i * (Math.PI / 2);
      const pulse = Math.sin(t * 2.2 + phase) * 0.25;
      l.intensity += (this.lightTarget.intensity + pulse - l.intensity) * 0.06;
      l.color.lerp(this.lightTarget.color, 0.05);
    });

    // Crowd wave (animate positions slightly)
    if (this.visible) {
      const pos = this.crowdPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < 3000; i++) {
        const base = this.crowdPositions[i*3+1];
        pos.setY(i, base + Math.sin(t * 3 + i * 0.8) * 0.12 * this.shakeIntensity);
      }
      pos.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  // ── Event effects ─────────────────────────────────────────────

  private applyEffects(event: MatchEvent) {
    switch (event.type) {
      case 'BUT':
        this.setFog(0x3a2200);
        this.flashLights(new THREE.Color(0xffcc00), 7, 0xfff8e8, 2.8);
        this.shakeIntensity = 1.2;
        this.playSound('goal');
        break;
      case 'PENALTY':
        this.setFog(0x2a1800);
        this.flashLights(new THREE.Color(0xff9900), 6, 0xfff8e8, 2.8);
        this.shakeIntensity = 0.9;
        this.playSound('goal');
        break;
      case 'CARTON_ROUGE':
        this.setFog(0x1e0000);
        this.flashLights(new THREE.Color(0xff1100), 5, 0xfff8e8, 2.8);
        this.shakeIntensity = 0.5;
        this.playSound('redcard');
        break;
      case 'CARTON_JAUNE':
        this.setFog(0x1a1400);
        this.flashLights(new THREE.Color(0xffe200), 4, 0xfff8e8, 2.8);
        this.playSound('yellowcard');
        break;
      case 'REMPLACEMENT':
        this.setFog(0x001530);
        this.flashLights(new THREE.Color(0x0077ff), 3.5, 0xfff8e8, 2.8);
        this.playSound('chime');
        break;
      case 'ARRET':
        this.setFog(0x002818);
        this.flashLights(new THREE.Color(0x00ff66), 5, 0xfff8e8, 2.8);
        this.shakeIntensity = 0.6;
        this.playSound('save');
        break;
      case 'HORS_JEU':
        this.setFog(0x120022);
        this.flashLights(new THREE.Color(0x8800ff), 3, 0xfff8e8, 2.8);
        this.playSound('whistle');
        break;
      case 'DEBUT_MI_TEMPS':
      case 'FIN_MI_TEMPS':
        this.setFog(0x001128);
        this.flashLights(new THREE.Color(0x3388ff), 4, 0xfff8e8, 2.8);
        this.playSound('halftime');
        break;
      default:
        this.setFog(0x0a0a1a);
        this.playSound('chime');
    }
  }

  private setFog(hex: number) {
    this.fogTarget.set(hex);
    setTimeout(() => this.fogTarget.set(0x000000), 3800);
  }

  private flashLights(flashColor: THREE.Color, flashIntensity: number, returnHex: number, returnIntensity: number) {
    this.lightTarget = { color: flashColor, intensity: flashIntensity };
    setTimeout(() => {
      this.lightTarget = { color: new THREE.Color(returnHex), intensity: returnIntensity };
    }, 1400);
  }

  // ── Particles ─────────────────────────────────────────────────

  private launchParticles(event: MatchEvent) {
    cancelAnimationFrame(this.pRafHandle);
    const canvas = this.pCanvasRef.nativeElement;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d')!;

    const cfg = this.getParticleCfg(event.type);
    this.particles = Array.from({ length: cfg.count }, () => this.mkParticle(canvas, cfg));

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.particles = this.particles.filter(p => p.life > 0);
      for (const p of this.particles) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        p.rot += p.drot;
        p.life -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);

        switch (p.shape) {
          case 'rect':
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.sz * 0.5, -p.sz * 0.22, p.sz, p.sz * 0.44);
            break;
          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, p.sz * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            break;
          case 'star':
            this.star(ctx, 0, 0, 5, p.sz * 0.5, p.sz * 0.22, p.color);
            break;
          case 'spark':
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-p.vx * 4, -p.vy * 4);
            ctx.stroke();
            break;
          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -p.sz * 0.55);
            ctx.lineTo(p.sz * 0.48, p.sz * 0.42);
            ctx.lineTo(-p.sz * 0.48, p.sz * 0.42);
            ctx.closePath();
            ctx.fillStyle = p.color;
            ctx.fill();
            break;
        }
        ctx.restore();
      }
      if (this.particles.length > 0) this.pRafHandle = requestAnimationFrame(tick);
    };
    this.pRafHandle = requestAnimationFrame(tick);
  }

  private getParticleCfg(type: string): ParticleCfg {
    const cfgs: Record<string, ParticleCfg> = {
      BUT:           { count: 220, colors: ['#FFD700','#FF8C00','#ffffff','#FFA500','#FFE066','#ffe29a'], shapes: ['rect','circle','star','triangle'], speed: 1.5, gravity: 0.13 },
      PENALTY:       { count: 180, colors: ['#FFD700','#FF6600','#ffffff','#FF8800'], shapes: ['rect','star','circle'], speed: 1.3, gravity: 0.12 },
      CARTON_ROUGE:  { count: 90,  colors: ['#FF1111','#CC0000','#FF4444','#ff6666'], shapes: ['rect','spark','triangle'], speed: 1.0, gravity: 0.07 },
      CARTON_JAUNE:  { count: 90,  colors: ['#FFE500','#FFCC00','#ffff80','#fff200'], shapes: ['rect','spark','circle'], speed: 0.9, gravity: 0.07 },
      REMPLACEMENT:  { count: 70,  colors: ['#0088FF','#44AAFF','#aaddff','#ffffff'], shapes: ['circle','spark'], speed: 0.75, gravity: 0.04 },
      ARRET:         { count: 120, colors: ['#00FF88','#00CC66','#aaffdd','#ffffff'], shapes: ['circle','star','spark'], speed: 1.2, gravity: 0.09 },
      HORS_JEU:      { count: 55,  colors: ['#9900FF','#BB44FF','#dd99ff'], shapes: ['spark','circle'], speed: 0.7, gravity: 0.03 },
      DEBUT_MI_TEMPS:{ count: 80,  colors: ['#4488FF','#88BBFF','#ffffff'], shapes: ['circle','star','rect'], speed: 0.85, gravity: 0.06 },
      FIN_MI_TEMPS:  { count: 80,  colors: ['#4488FF','#88BBFF','#ffffff'], shapes: ['circle','star','rect'], speed: 0.85, gravity: 0.06 },
    };
    return cfgs[type] ?? { count: 60, colors: ['#ffffff','#aaaaff'], shapes: ['circle'], speed: 0.8, gravity: 0.05 };
  }

  private mkParticle(canvas: HTMLCanvasElement, cfg: ParticleCfg): Particle {
    const shape  = cfg.shapes[Math.floor(Math.random() * cfg.shapes.length)];
    const color  = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
    const angle  = Math.random() * Math.PI * 2;
    const speed  = (Math.random() * 6 + 2) * cfg.speed;
    return {
      x:     canvas.width  * 0.5 + (Math.random() - 0.5) * canvas.width  * 0.45,
      y:     canvas.height * 0.42 + (Math.random() - 0.5) * canvas.height * 0.22,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed - Math.random() * 4,
      gravity: cfg.gravity,
      sz:    Math.random() * 11 + 4,
      color, shape,
      rot:   Math.random() * Math.PI * 2,
      drot:  (Math.random() - 0.5) * 0.18,
      life:  1,
      decay: Math.random() * 0.009 + 0.004,
    };
  }

  private star(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outer: number, inner: number, color: string) {
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
    for (let i = 0; i < spikes; i++) {
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ── Web Audio ─────────────────────────────────────────────────

  private getCtx(): AudioContext {
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    return this.audioCtx;
  }

  private playSound(type: string) {
    try {
      const ctx = this.getCtx();
      if (type === 'goal')      { this.sndGoal(ctx); }
      else if (type === 'redcard')   { this.sndGasp(ctx); this.sndWhistle(ctx, 0.45); }
      else if (type === 'yellowcard'){ this.sndWhistle(ctx, 0.35); }
      else if (type === 'save')      { this.sndOhh(ctx); }
      else if (type === 'whistle')   { this.sndWhistle(ctx, 0.6); }
      else if (type === 'halftime')  { this.sndWhistle(ctx, 1.1); this.sndMurmur(ctx, 0.18, 2); }
      else if (type === 'chime')     { this.sndChime(ctx); }
    } catch (_) {}
  }

  private sndGoal(ctx: AudioContext) {
    const dur = 3.8;
    // Layered crowd noise
    const buf = this.whiteNoise(ctx, dur);
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 180;
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass';  lpf.frequency.value = 900;
    const pk  = ctx.createBiquadFilter(); pk.type  = 'peaking';  pk.frequency.value  = 400; pk.gain.value = 14; pk.Q.value = 0.7;

    const rev = ctx.createConvolver();
    rev.buffer = this.impulse(ctx, 2.2, 0.4);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(1.3, ctx.currentTime + 0.2);
    g.gain.setValueAtTime(1.3, ctx.currentTime + dur - 1);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);

    src.connect(hpf); hpf.connect(lpf); lpf.connect(pk);
    pk.connect(g); pk.connect(rev); rev.connect(g);
    g.connect(ctx.destination);

    // Bass "thud" for impact
    const bass = ctx.createOscillator();
    bass.type = 'sine'; bass.frequency.setValueAtTime(65, ctx.currentTime); bass.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.4);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.7, ctx.currentTime); bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    bass.connect(bg); bg.connect(ctx.destination);
    bass.start(ctx.currentTime); bass.stop(ctx.currentTime + 0.5);

    // Rising excitement tone
    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(90, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.6);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.25, ctx.currentTime); og.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.4);
    osc.connect(og); og.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.4);

    src.start(ctx.currentTime); src.stop(ctx.currentTime + dur);
  }

  private sndGasp(ctx: AudioContext) {
    // Descending crowd reaction
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(550, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 1.0);
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);
    osc.connect(lpf); lpf.connect(g); g.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.3);
    this.sndMurmur(ctx, 0.2, 1.5);
  }

  private sndWhistle(ctx: AudioContext, dur: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2900, ctx.currentTime);
    osc.frequency.setValueAtTime(2650, ctx.currentTime + dur * 0.55);

    // Vibrato
    const vib = ctx.createOscillator(); vib.type = 'sine'; vib.frequency.value = 9;
    const vg  = ctx.createGain(); vg.gain.value = 28;
    vib.connect(vg); vg.connect(osc.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.025);
    g.gain.setValueAtTime(0.55, ctx.currentTime + dur - 0.08);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);

    osc.connect(g); g.connect(ctx.destination);
    vib.start(ctx.currentTime); vib.stop(ctx.currentTime + dur);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
  }

  private sndOhh(ctx: AudioContext) {
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(210, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(370, ctx.currentTime + 0.45);
    osc.frequency.linearRampToValueAtTime(210, ctx.currentTime + 1.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.55, ctx.currentTime + 0.9);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.6);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.6);
    this.sndMurmur(ctx, 0.22, 1.8);
  }

  private sndChime(ctx: AudioContext) {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.13;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.28, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 1.1);
    });
  }

  private sndMurmur(ctx: AudioContext, vol: number, dur: number) {
    const buf = this.whiteNoise(ctx, dur);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 450;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    src.connect(lpf); lpf.connect(g); g.connect(ctx.destination);
    src.start(ctx.currentTime); src.stop(ctx.currentTime + dur);
  }

  private whiteNoise(ctx: AudioContext, dur: number): AudioBuffer {
    const n = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private impulse(ctx: AudioContext, dur: number, decay: number): AudioBuffer {
    const n = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return buf;
  }

  // ── Template helpers ──────────────────────────────────────────

  getLabel(type: string): string {
    return ({
      BUT: 'BUT !', PENALTY: 'PENALTY !',
      CARTON_ROUGE: 'CARTON ROUGE', CARTON_JAUNE: 'CARTON JAUNE',
      REMPLACEMENT: 'REMPLACEMENT', ARRET: 'ARRÊT !',
      HORS_JEU: 'HORS-JEU',
      DEBUT_MI_TEMPS: 'DÉBUT MI-TEMPS', FIN_MI_TEMPS: 'FIN MI-TEMPS',
    } as Record<string, string>)[type] ?? type.replace(/_/g, ' ');
  }

  getAccent(type: string): string {
    return ({
      BUT: '#FFD700', PENALTY: '#FF8800',
      CARTON_ROUGE: '#FF2222', CARTON_JAUNE: '#FFE500',
      REMPLACEMENT: '#3399FF', ARRET: '#00FF88',
      HORS_JEU: '#AA44FF',
      DEBUT_MI_TEMPS: '#44AAFF', FIN_MI_TEMPS: '#44AAFF',
    } as Record<string, string>)[type] ?? '#ffffff';
  }

  isGoal(type: string): boolean {
    return type === 'BUT' || type === 'PENALTY';
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  ngOnDestroy() {
    cancelAnimationFrame(this.rafHandle);
    cancelAnimationFrame(this.pRafHandle);
    clearTimeout(this.dismissTimer);
    this.renderer?.dispose();
    this.audioCtx?.close().catch(() => {});
  }
}

interface ParticleCfg {
  count: number; colors: string[]; shapes: string[]; speed: number; gravity: number;
}
interface Particle {
  x: number; y: number; vx: number; vy: number; gravity: number;
  sz: number; color: string; shape: string; rot: number; drot: number;
  life: number; decay: number;
}
