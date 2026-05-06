import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatchService } from '../services/match.service';
import { GeminiAiService, VoiceCommentaryRequest } from '../services/gemini-ai.service';
import { Match, MatchStatus, EventType } from '../models/match.model';
import { TerrainService } from '../../terrains/services/terrain.service';
import { AIService } from '../../core/services/AIService/ai.service';

@Component({
    selector: 'app-match-detail',
    templateUrl: './match-detail.component.html',
    styleUrls: ['./match-detail.component.css']
})
export class MatchDetailComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    match?: Match;
    loading = false;
    error = '';
    updating = false;
    terrainName?: string;

    isPredicting = false;
    prediction?: any;

    eventForm!: FormGroup;
    showEventForm = false;

    // AI Summary state
    summaryLoading = false;
    summaryText    = '';
    summaryError   = '';
    summaryFromLlm = false;

    // AI Voice Commentary state
    voiceEnabled  = false;
    voicePlaying  = false;
    voiceText     = '';
    private bestVoice:    SpeechSynthesisVoice | null = null;
    private currentAudio: HTMLAudioElement    | null = null;

    eventTypes: EventType[] = ['BUT', 'CARTON_JAUNE', 'CARTON_ROUGE', 'REMPLACEMENT', 'ARRET', 'HORS_JEU', 'PENALTY', 'DEBUT_MI_TEMPS', 'FIN_MI_TEMPS'];
    statusTransitions: Record<string, MatchStatus[]> = {
        PLANIFIE: ['EN_COURS', 'ANNULE', 'REPORTE'],
        EN_COURS: ['TERMINE', 'ANNULE'],
        REPORTE: ['PLANIFIE', 'ANNULE'],
        TERMINE: [],
        ANNULE: []
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private matchService: MatchService,
        private sanitizer: DomSanitizer,
        private terrainService: TerrainService,
        private geminiAi: GeminiAiService
    ) { }

    ngOnInit() {
        this.eventForm = this.fb.group({
            type: ['', Validators.required],
            minute: [null, [Validators.required, Validators.min(0), Validators.max(120)]],
            joueur: [''],
            equipe: [''],
            description: ['']
        });

        this.load();
        this.initVoice();
    }

    private initVoice() {
        if (!('speechSynthesis' in window)) return;
        const pick = () => {
            this.bestVoice = this.pickBestFrenchVoice();
            if (this.bestVoice) this.prewarmSpeech();
        };
        pick();
        // voices load asynchronously on first page load — retry when ready
        if (!this.bestVoice) {
            window.speechSynthesis.addEventListener('voiceschanged', pick, { once: true } as EventListenerOptions);
        }
    }

    private pickBestFrenchVoice(): SpeechSynthesisVoice | null {
        const all = window.speechSynthesis.getVoices();
        const fr  = all.filter(v => v.lang.startsWith('fr'));
        if (!fr.length) return null;

        // Priority list — highest quality voices first.
        // Edge/Chrome Windows 11 expose Microsoft Online Natural voices via Web Speech API.
        const priority: Array<SpeechSynthesisVoice | undefined> = [
            // Edge neural voices (Windows 11) — best quality, natural prosody
            fr.find(v => /Denise|Sylvie|Henri|Rémi|Brigitte/.test(v.name) && /Natural|Online/.test(v.name)),
            // Any Edge/Chrome Online Natural voice in French
            fr.find(v => /Natural|Online/.test(v.name)),
            // Google's French voice (Chrome)
            fr.find(v => v.name.toLowerCase().includes('google')),
            // Apple neural voices (macOS/iOS)
            fr.find(v => /Marie|Thomas|Amelie/.test(v.name)),
            // Generic Microsoft desktop voices (Windows)
            fr.find(v => v.name.toLowerCase().includes('microsoft') && v.lang === 'fr-FR'),
            // Any fr-FR as fallback
            fr.find(v => v.lang === 'fr-FR'),
            // Any French at all
            fr[0],
        ];

        return priority.find((v): v is SpeechSynthesisVoice => !!v) ?? null;
    }

    ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

    load() {
        const id = this.route.snapshot.paramMap.get('id')!;
        this.loading = true;
        this.matchService.getById(id).pipe(takeUntil(this.destroy$)).subscribe({
            next: m => {
                this.match = m;
                this.loading = false;
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
        this.matchService.updateStatus(this.match.id, s).pipe(takeUntil(this.destroy$)).subscribe(m => this.match = m);
    }

    submitEvent() {
        if (this.eventForm.invalid || !this.match?.id) return;
        this.updating = true;
        // Capture values before the form resets
        const payload = { ...this.eventForm.value };
        this.matchService.addEvent(this.match.id, payload).pipe(takeUntil(this.destroy$)).subscribe({
            next: m => {
                this.match = m;
                this.eventForm.reset();
                this.showEventForm = false;
                this.updating = false;
                if (this.voiceEnabled) this.triggerVoiceCommentary(payload);
            },
            error: err => { this.error = err.error?.message || 'Erreur'; this.updating = false; }
        });
    }

    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        if (!this.voiceEnabled) {
            // Stop any in-progress audio — Google TTS or speechSynthesis
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            window.speechSynthesis?.cancel();
            this.voicePlaying = false;
            this.voiceText    = '';
        }
    }

    // Pre-warm speechSynthesis — first call on some browsers uses wrong voice
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
            player:      event.joueur || undefined,
            team_name:   event.equipe === 'equipe1' ? this.match.equipe1
                       : event.equipe === 'equipe2' ? this.match.equipe2
                       : undefined,
            score_team1: this.match.scoreEquipe1,
            score_team2: this.match.scoreEquipe2,
            match_team1: this.match.equipe1,
            match_team2: this.match.equipe2,
        };
        this.geminiAi.generateVoiceCommentary(req)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.voiceText = res.commentary;
                    if (res.audio_available && res.audio_base64) {
                        this.playAudio(res.audio_base64);
                    } else {
                        this.speak(res.commentary);
                    }
                },
                error: () => this.speak(`${event.type.replace(/_/g, ' ')} à la ${event.minute}ème minute !`),
            });
    }

    private playAudio(base64: string) {
        // Stop any previous audio
        if (this.currentAudio) { this.currentAudio.pause(); this.currentAudio = null; }
        window.speechSynthesis?.cancel();

        try {
            const binary = atob(base64);
            const bytes  = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: 'audio/mpeg' });
            const url  = URL.createObjectURL(blob);

            const audio       = new Audio(url);
            this.currentAudio = audio;
            this.voicePlaying = true;

            audio.onended = () => {
                URL.revokeObjectURL(url);
                this.voicePlaying = false;
                this.voiceText    = '';
                this.currentAudio = null;
            };
            audio.onerror = () => {
                URL.revokeObjectURL(url);
                this.voicePlaying = false;
                this.voiceText    = '';
                this.currentAudio = null;
                // Fallback to speechSynthesis if audio element fails
                this.speak(this.voiceText);
            };
            audio.play().catch(() => {
                // Autoplay policy blocked — fall back to speechSynthesis
                URL.revokeObjectURL(url);
                this.currentAudio = null;
                this.speak(this.voiceText);
            });
        } catch {
            this.voicePlaying = false;
            this.voiceText    = '';
        }
    }

    private speak(text: string) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        const u    = new SpeechSynthesisUtterance(text);
        u.lang     = 'fr-FR';
        u.volume   = 1;
        // Broadcaster parameters — lower pitch sounds authoritative, rate slightly fast = excitement
        u.rate     = 0.93;
        u.pitch    = 0.82;

        // Use the pre-loaded best voice; if still null, try once more
        if (!this.bestVoice) this.bestVoice = this.pickBestFrenchVoice();
        if (this.bestVoice) u.voice = this.bestVoice;

        this.voicePlaying = true;
        this.voiceText    = text;
        u.onend   = () => { this.voicePlaying = false; this.voiceText = ''; };
        u.onerror = () => { this.voicePlaying = false; this.voiceText = ''; };
        window.speechSynthesis.speak(u);
    }

    deleteEvent(eventId: string) {
        if (!this.match?.id || !confirm('Supprimer cet événement ?')) return;
        this.matchService.deleteEvent(this.match.id, eventId).pipe(takeUntil(this.destroy$)).subscribe(m => this.match = m);
    }

    generateSummary() {
        if (!this.match) return;
        this.summaryLoading = true;
        this.summaryText    = '';
        this.summaryError   = '';
        this.geminiAi.generateMatchSummary(this.match)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
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

    getIconClass(type: string): string {
        if (type === 'BUT' || type === 'PENALTY') return 'icon-but';
        if (type === 'CARTON_JAUNE') return 'icon-carton-j';
        if (type === 'CARTON_ROUGE') return 'icon-carton-r';
        return 'icon-default';
    }

    getSvgIcon(type: string): SafeHtml {
        let svg = '';
        if (type === 'BUT' || type === 'PENALTY') {
            svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
        } else if (type === 'CARTON_JAUNE' || type === 'CARTON_ROUGE') {
            svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="16" rx="2"/></svg>`;
        } else if (type === 'REMPLACEMENT') {
            svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 11-4-4-4 4"/><path d="M10 7v10"/><path d="m10 13 4 4 4-4"/><path d="M14 17V7"/></svg>`;
        } else {
            svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>`;
        }
        return this.sanitizer.bypassSecurityTrustHtml(svg);
    }

    formatDate(d?: string) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}
