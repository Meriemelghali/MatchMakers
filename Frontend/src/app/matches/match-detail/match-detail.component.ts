import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatchService } from '../services/match.service';
import { GeminiAiService, VoiceCommentaryRequest } from '../services/gemini-ai.service';
import { Match, MatchEvent, MatchStatus, EventType } from '../models/match.model';
import { TerrainService } from '../../terrains/services/terrain.service';
import { StadiumReactionComponent } from '../stadium-reaction/stadium-reaction.component';

export interface PlayerRating {
  name: string;
  team: 'equipe1' | 'equipe2' | '';
  rating: number;
  events: EventType[];
}

export interface FormationDot {
  x: number; y: number;
  label: string;
  active: boolean;
  redCard: boolean;
  hasGoal: boolean;
}

@Component({
  selector: 'app-match-detail',
  templateUrl: './match-detail.component.html',
  styleUrls: ['./match-detail.component.css']
})
export class MatchDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild(StadiumReactionComponent) stadiumReaction?: StadiumReactionComponent;

  match?: Match;
  loading  = false;
  error    = '';
  updating = false;
  terrainName?: string;

  eventForm!: FormGroup;
  showEventForm = false;

  // Timer
  liveMinute  = 0;
  liveSeconds = 0;
  private clockRef: any;

  // Tabs
  activeTab: 'timeline' | 'stats' | 'players' | 'formation' = 'timeline';

  // AI Summary
  summaryLoading = false;
  summaryText    = '';
  summaryError   = '';
  summaryFromLlm = false;

  // Voice
  voiceEnabled  = false;
  voicePlaying  = false;
  voiceText     = '';
  private bestVoice:    SpeechSynthesisVoice | null = null;
  private currentAudio: HTMLAudioElement    | null = null;

  readonly eventTypes: EventType[] = [
    'BUT', 'CARTON_JAUNE', 'CARTON_ROUGE', 'REMPLACEMENT',
    'ARRET', 'HORS_JEU', 'PENALTY', 'DEBUT_MI_TEMPS', 'FIN_MI_TEMPS'
  ];

  readonly statusTransitions: Record<string, MatchStatus[]> = {
    PLANIFIE: ['EN_COURS', 'ANNULE', 'REPORTE'],
    EN_COURS: ['TERMINE', 'ANNULE'],
    REPORTE:  ['PLANIFIE', 'ANNULE'],
    TERMINE:  [],
    ANNULE:   []
  };

  // Formation 4-3-3 positions (% x, % y) — team1 attacks top→bottom, team2 bottom→top
  private readonly F433: [number, number][] = [
    [50, 88],
    [18, 72], [37, 73], [63, 73], [82, 72],
    [27, 55], [50, 52], [73, 55],
    [20, 36], [50, 32], [80, 36],
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private matchService: MatchService,
    private sanitizer: DomSanitizer,
    private terrainService: TerrainService,
    private geminiAi: GeminiAiService
  ) {}

  ngOnInit() {
    this.eventForm = this.fb.group({
      type:        ['', Validators.required],
      minute:      [null, [Validators.required, Validators.min(0), Validators.max(120)]],
      joueur:      [''],
      equipe:      [''],
      description: ['']
    });
    this.load();
    this.initVoice();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopClock();
  }

  // ── Data ──────────────────────────────────────────────────────

  load() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;
    this.matchService.getById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: m => {
        this.match   = m;
        this.loading = false;
        if (m.statut === 'EN_COURS') this.startClock();
        if (m.terrainId) {
          this.terrainService.getById(m.terrainId).pipe(takeUntil(this.destroy$)).subscribe({
            next: t => this.terrainName = t.nom,
            error: () => this.terrainName = 'Terrain inconnu'
          });
        }
      },
      error: () => { this.error = 'Match introuvable'; this.loading = false; }
    });
  }

  get availableStatuses(): MatchStatus[] {
    return this.statusTransitions[this.match?.statut || ''] || [];
  }

  changeStatus(s: MatchStatus) {
    if (!this.match?.id) return;
    this.matchService.updateStatus(this.match.id, s).pipe(takeUntil(this.destroy$)).subscribe(m => {
      this.match = m;
      if (s === 'EN_COURS') this.startClock();
      else this.stopClock();
    });
  }

  submitEvent() {
    if (this.eventForm.invalid || !this.match?.id) return;
    this.updating = true;
    const payload = { ...this.eventForm.value };
    this.matchService.addEvent(this.match.id, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: m => {
        this.match    = m;
        this.updating = false;
        this.eventForm.reset();
        this.showEventForm = false;
        const teamLabel = payload.equipe === 'equipe1' ? m.equipe1
                        : payload.equipe === 'equipe2' ? m.equipe2 : '';
        this.stadiumReaction?.trigger(payload, teamLabel, m.scoreEquipe1, m.scoreEquipe2);
        if (this.voiceEnabled) this.triggerVoiceCommentary(payload);
      },
      error: err => { this.error = err.error?.message || 'Erreur'; this.updating = false; }
    });
  }

  deleteEvent(eventId: string) {
    if (!this.match?.id || !confirm('Supprimer cet événement ?')) return;
    this.matchService.deleteEvent(this.match.id, eventId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(m => this.match = m);
  }

  // ── Live Clock ────────────────────────────────────────────────

  private startClock() {
    this.stopClock();
    if (!this.match) return;
    const start = new Date(this.match.dateDebut).getTime();
    const tick = () => {
      const elapsed    = Math.max(0, Math.floor((Date.now() - start) / 1000));
      this.liveMinute  = Math.min(Math.floor(elapsed / 60), 120);
      this.liveSeconds = elapsed % 60;
    };
    tick();
    this.clockRef = setInterval(tick, 1000);
  }

  private stopClock() {
    if (this.clockRef) clearInterval(this.clockRef);
    this.clockRef = null;
  }

  get timerDisplay(): string {
    const s = this.match?.statut;
    if (s === 'PLANIFIE')  return 'À venir';
    if (s === 'TERMINE')   return 'Terminé';
    if (s === 'ANNULE')    return 'Annulé';
    if (s === 'REPORTE')   return 'Reporté';
    return `${this.liveMinute}'`;
  }

  get timerSeconds(): string {
    return String(this.liveSeconds).padStart(2, '0');
  }

  get isLive(): boolean { return this.match?.statut === 'EN_COURS'; }

  // ── Computed Stats ────────────────────────────────────────────

  get evts(): MatchEvent[] { return this.match?.evenements || []; }

  private cnt(type: string, team: string) {
    return this.evts.filter(e => e.type === type && e.equipe === team).length;
  }

  get matchStats() {
    const s1 = this.cnt('BUT','equipe1') + this.cnt('PENALTY','equipe1') + this.cnt('ARRET','equipe1');
    const s2 = this.cnt('BUT','equipe2') + this.cnt('PENALTY','equipe2') + this.cnt('ARRET','equipe2');
    const st = s1 + s2 || 1;
    const h1 = this.cnt('HORS_JEU','equipe1');
    const h2 = this.cnt('HORS_JEU','equipe2');
    const ht = h1 + h2 || 1;
    return {
      possession: this.possession,
      shots:    { t1: s1, t2: s2, p1: Math.round(s1/st*100), p2: Math.round(s2/st*100) },
      yellow:   { t1: this.cnt('CARTON_JAUNE','equipe1'), t2: this.cnt('CARTON_JAUNE','equipe2') },
      red:      { t1: this.cnt('CARTON_ROUGE','equipe1'), t2: this.cnt('CARTON_ROUGE','equipe2') },
      fouls:    { t1: h1, t2: h2, p1: Math.round(h1/ht*100), p2: Math.round(h2/ht*100) },
      goals:    { t1: this.match?.scoreEquipe1 ?? 0, t2: this.match?.scoreEquipe2 ?? 0 },
    };
  }

  get possession(): { t1: number; t2: number } {
    const t1 = this.evts.filter(e => e.equipe === 'equipe1').length;
    const t2 = this.evts.filter(e => e.equipe === 'equipe2').length;
    const total = t1 + t2;
    if (!total) return { t1: 50, t2: 50 };
    return { t1: Math.round(t1 / total * 100), t2: Math.round(t2 / total * 100) };
  }

  get momentum(): number {
    const w: Record<string, number> = {
      BUT: 30, PENALTY: 25, ARRET: 12,
      CARTON_ROUGE: -10, CARTON_JAUNE: -4, HORS_JEU: -3, REMPLACEMENT: 0
    };
    let m = 0;
    this.evts.forEach(e => {
      const wt = w[e.type] ?? 0;
      m += e.equipe === 'equipe1' ? wt : e.equipe === 'equipe2' ? -wt : 0;
    });
    return Math.max(-100, Math.min(100, m));
  }

  get momentumPct1(): number { return Math.round((100 + this.momentum) / 2); }
  get momentumPct2(): number { return 100 - this.momentumPct1; }

  // ── Player Ratings ────────────────────────────────────────────

  get playerRatings(): PlayerRating[] {
    const map: Record<string, PlayerRating> = {};
    const weights: Partial<Record<EventType, number>> = {
      BUT: 2.0, PENALTY: 1.5, ARRET: 1.5,
      CARTON_ROUGE: -2.5, CARTON_JAUNE: -0.8, REMPLACEMENT: 0, HORS_JEU: -0.3
    };
    this.evts.forEach(e => {
      if (!e.joueur) return;
      if (!map[e.joueur]) {
        map[e.joueur] = { name: e.joueur, team: (e.equipe || '') as any, rating: 6.5, events: [] };
      }
      map[e.joueur].rating = Math.max(1, Math.min(10,
        map[e.joueur].rating + (weights[e.type as EventType] ?? 0)
      ));
      map[e.joueur].events.push(e.type as EventType);
    });
    return Object.values(map).sort((a, b) => b.rating - a.rating);
  }

  ratingColor(r: number): string {
    if (r >= 8.5) return '#f59e0b';
    if (r >= 7.5) return '#22c55e';
    if (r >= 6.0) return '#3b82f6';
    if (r >= 5.0) return '#f97316';
    return '#ef4444';
  }

  ratingLabel(r: number): string {
    if (r >= 9)   return 'Exceptionnel';
    if (r >= 8)   return 'Excellent';
    if (r >= 7)   return 'Bon';
    if (r >= 6)   return 'Correct';
    if (r >= 5)   return 'Passable';
    return 'Difficile';
  }

  eventBadgeClass(type: EventType): string {
    if (type === 'BUT' || type === 'PENALTY') return 'eb-goal';
    if (type === 'CARTON_JAUNE') return 'eb-yellow';
    if (type === 'CARTON_ROUGE') return 'eb-red';
    if (type === 'ARRET') return 'eb-save';
    return 'eb-default';
  }

  // ── Timeline ──────────────────────────────────────────────────

  get timelineEvents(): MatchEvent[] {
    return [...this.evts].sort((a, b) => a.minute - b.minute);
  }

  eventLeft(minute: number): number {
    return Math.min(minute / 90 * 100, 97);
  }

  timelineTeam(e: MatchEvent): 'top' | 'bottom' | 'center' {
    if (e.equipe === 'equipe1') return 'top';
    if (e.equipe === 'equipe2') return 'bottom';
    return 'center';
  }

  // Stack events at same minute
  timelineOffset(e: MatchEvent, events: MatchEvent[]): number {
    const sameMin = events.filter(x => x.minute === e.minute && x.equipe === e.equipe);
    return sameMin.indexOf(e) * 28;
  }

  // ── Formation Dots ────────────────────────────────────────────

  get dotsTeam1(): FormationDot[] {
    return this.buildDots('equipe1', false);
  }

  get dotsTeam2(): FormationDot[] {
    return this.buildDots('equipe2', true);
  }

  private buildDots(team: string, mirror: boolean): FormationDot[] {
    const teamEvts = this.evts.filter(e => e.equipe === team);
    const reds = new Set(
      this.evts.filter(e => e.type === 'CARTON_ROUGE' && e.equipe === team).map(e => e.joueur)
    );
    const subs = this.evts.filter(e => e.type === 'REMPLACEMENT' && e.equipe === team).length;

    return this.F433.map(([x, y], i) => ({
      x,
      y: mirror ? 100 - y : y,
      label: `${i + 1}`,
      active: i < 11 - Math.min(subs, 3),
      redCard: i < reds.size,
      hasGoal: teamEvts.some(e => (e.type === 'BUT' || e.type === 'PENALTY'))
    }));
  }

  // ── Helpers ───────────────────────────────────────────────────

  getSvgIcon(type: string): SafeHtml {
    const icons: Record<string, string> = {
      BUT:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
      PENALTY: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
      CARTON_JAUNE: `<svg viewBox="0 0 24 24" fill="#FFE500" stroke="#cc9900" stroke-width="1.5"><rect x="6" y="4" width="12" height="16" rx="2"/></svg>`,
      CARTON_ROUGE: `<svg viewBox="0 0 24 24" fill="#FF2222" stroke="#aa0000" stroke-width="1.5"><rect x="6" y="4" width="12" height="16" rx="2"/></svg>`,
      REMPLACEMENT: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m14 11-4-4-4 4"/><path d="M10 7v10"/><path d="m10 13 4 4 4-4"/><path d="M14 17V7"/></svg>`,
      ARRET: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`,
      HORS_JEU: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18M21 3 3 21"/></svg>`,
      DEBUT_MI_TEMPS: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      FIN_MI_TEMPS:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    };
    return this.sanitizer.bypassSecurityTrustHtml(
      icons[type] ?? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>`
    );
  }

  getEventLabel(type: string): string {
    const labels: Record<string, string> = {
      BUT: 'But', PENALTY: 'Penalty', CARTON_JAUNE: 'Carton J.',
      CARTON_ROUGE: 'Carton R.', REMPLACEMENT: 'Rempl.', ARRET: 'Arrêt',
      HORS_JEU: 'Hors-jeu', DEBUT_MI_TEMPS: 'Début MT', FIN_MI_TEMPS: 'Fin MT'
    };
    return labels[type] ?? type;
  }

  getEventAccent(type: string): string {
    const c: Record<string, string> = {
      BUT: '#FFD700', PENALTY: '#FF8800', CARTON_JAUNE: '#FFE500',
      CARTON_ROUGE: '#FF2222', REMPLACEMENT: '#3399FF', ARRET: '#00D68F',
      HORS_JEU: '#AA44FF', DEBUT_MI_TEMPS: '#44AAFF', FIN_MI_TEMPS: '#44AAFF',
    };
    return c[type] ?? 'rgba(255,255,255,0.5)';
  }

  formatDate(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  trackById(_: number, e: MatchEvent) { return e.id; }

  // ── AI Summary ────────────────────────────────────────────────

  generateSummary() {
    if (!this.match) return;
    this.summaryLoading = true;
    this.summaryText    = '';
    this.summaryError   = '';
    this.geminiAi.generateMatchSummary(this.match).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.summaryText    = res.summary;
        this.summaryFromLlm = res.from_llm;
        this.summaryLoading = false;
      },
      error: () => {
        this.summaryError   = 'Erreur lors de la génération du résumé.';
        this.summaryLoading = false;
      }
    });
  }

  // ── Voice ─────────────────────────────────────────────────────

  private initVoice() {
    if (!('speechSynthesis' in window)) return;
    const pick = () => {
      this.bestVoice = this.pickBestFrenchVoice();
      if (this.bestVoice) this.prewarmSpeech();
    };
    pick();
    if (!this.bestVoice) {
      window.speechSynthesis.addEventListener('voiceschanged', pick, { once: true } as EventListenerOptions);
    }
  }

  private pickBestFrenchVoice(): SpeechSynthesisVoice | null {
    const all = window.speechSynthesis.getVoices();
    const fr  = all.filter(v => v.lang.startsWith('fr'));
    if (!fr.length) return null;
    const priority = [
      fr.find(v => /Denise|Sylvie|Henri|Rémi|Brigitte/.test(v.name) && /Natural|Online/.test(v.name)),
      fr.find(v => /Natural|Online/.test(v.name)),
      fr.find(v => v.name.toLowerCase().includes('google')),
      fr.find(v => /Marie|Thomas|Amelie/.test(v.name)),
      fr.find(v => v.name.toLowerCase().includes('microsoft') && v.lang === 'fr-FR'),
      fr.find(v => v.lang === 'fr-FR'),
      fr[0],
    ];
    return priority.find((v): v is SpeechSynthesisVoice => !!v) ?? null;
  }

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    if (!this.voiceEnabled) {
      this.currentAudio?.pause();
      this.currentAudio = null;
      window.speechSynthesis?.cancel();
      this.voicePlaying = false;
      this.voiceText    = '';
    }
  }

  private prewarmSpeech() {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    window.speechSynthesis.cancel();
  }

  private triggerVoiceCommentary(event: { type: string; minute?: number; joueur?: string; equipe?: string }) {
    if (!this.match) return;
    const req: VoiceCommentaryRequest = {
      event_type:  event.type,
      minute:      event.minute ?? undefined,
      player:      event.joueur  || undefined,
      team_name:   event.equipe === 'equipe1' ? this.match.equipe1
                 : event.equipe === 'equipe2' ? this.match.equipe2 : undefined,
      score_team1: this.match.scoreEquipe1,
      score_team2: this.match.scoreEquipe2,
      match_team1: this.match.equipe1,
      match_team2: this.match.equipe2,
    };
    this.geminiAi.generateVoiceCommentary(req).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.voiceText = res.commentary;
        if (res.audio_available && res.audio_base64) this.playAudio(res.audio_base64);
        else this.speak(res.commentary);
      },
      error: () => this.speak(`${event.type.replace(/_/g, ' ')} à la ${event.minute}ème minute !`),
    });
  }

  private playAudio(base64: string) {
    this.currentAudio?.pause();
    this.currentAudio = null;
    window.speechSynthesis?.cancel();
    try {
      const binary = atob(base64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const url   = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
      const audio = new Audio(url);
      this.currentAudio = audio;
      this.voicePlaying = true;
      audio.onended = () => { URL.revokeObjectURL(url); this.voicePlaying = false; this.voiceText = ''; this.currentAudio = null; };
      audio.onerror = () => { URL.revokeObjectURL(url); this.voicePlaying = false; this.speak(this.voiceText); };
      audio.play().catch(() => { URL.revokeObjectURL(url); this.currentAudio = null; this.speak(this.voiceText); });
    } catch { this.voicePlaying = false; this.voiceText = ''; }
  }

  private speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u   = new SpeechSynthesisUtterance(text);
    u.lang    = 'fr-FR'; u.volume = 1; u.rate = 0.93; u.pitch = 0.82;
    if (!this.bestVoice) this.bestVoice = this.pickBestFrenchVoice();
    if (this.bestVoice) u.voice = this.bestVoice;
    this.voicePlaying = true; this.voiceText = text;
    u.onend   = () => { this.voicePlaying = false; this.voiceText = ''; };
    u.onerror = () => { this.voicePlaying = false; this.voiceText = ''; };
    window.speechSynthesis.speak(u);
  }
}
