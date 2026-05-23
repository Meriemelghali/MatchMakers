import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Reward, RewardDesign, RewardService } from '../services/reward.service';

type RibbonStyle = 'CLASSIC' | 'NONE';

@Component({
  selector: 'app-reward-designer',
  templateUrl: './reward-designer.component.html',
  styleUrls: ['./reward-designer.component.css']
})
export class RewardDesignerComponent implements OnInit, OnDestroy, AfterViewChecked {
  reward: Reward | null = null;
  loading = false;
  saving = false;
  error = '';
  success = '';

  readonly canvasSize = 512;

  ribbonStyle: RibbonStyle = 'CLASSIC';
  accent = '#f59f00';
  accent2 = '#ffd43b';
  ribbonLeft = '#1971c2';
  ribbonRight = '#e03131';

  title = '';
  subtitle = '';
  showText = true;

  imageScale = 1.0;
  imageRotateDeg = 0;

  exportUrl: string | null = null;

  private droppedImage: HTMLImageElement | null = null;
  private droppedImageUrl: string | null = null;
  private raf = 0;

  @ViewChild('canvas', { static: false }) canvasRef?: ElementRef<HTMLCanvasElement>;
  private lastCanvasReady = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rewards: RewardService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/rewards']);
      return;
    }
    this.fetch(id);
  }

  ngOnDestroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.clearDroppedImage();
  }

  private fetch(id: string): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    this.rewards.getRewardById(id).subscribe({
      next: r => {
        this.reward = r;
        this.title = r.name || 'Médaille';
        this.subtitle = (r.rarity ?? '').toString() || (r.type ?? '').toString() || '';

        // Rehydrate previously saved design (if any)
        const d = (r as any)?.design as RewardDesign | undefined;
        if (d) this.applyDesign(d);
        this.loading = false;
        // Wait a tick so the canvas exists (it's under *ngIf).
        setTimeout(() => this.queueDraw(), 0);
      },
      error: err => {
        console.error(err);
        this.error = 'Impossible de charger cette récompense.';
        this.loading = false;
      }
    });
  }

  // When the canvas becomes available (after *ngIf), draw once.
  ngAfterViewChecked(): void {
    const ready = !!this.canvasRef?.nativeElement;
    if (ready && !this.lastCanvasReady) {
      this.lastCanvasReady = true;
      this.queueDraw();
    }
    if (!ready && this.lastCanvasReady) {
      this.lastCanvasReady = false;
    }
  }

  isOverDrop = false;

  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.isOverDrop = true;
  }

  onDragLeave(ev: DragEvent): void {
    ev.preventDefault();
    this.isOverDrop = false;
  }

  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.isOverDrop = false;
    const file = ev.dataTransfer?.files?.[0];
    if (file) this.loadFile(file);
  }

  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (file) this.loadFile(file);
    if (input) input.value = '';
  }

  private loadFile(file: File): void {
    this.error = '';
    this.success = '';
    this.exportUrl = null;

    if (!file.type?.startsWith('image/')) {
      this.error = 'Fichier non supporté. Glisse une image (PNG/JPG/SVG).';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      this.error = 'Impossible de lire ce fichier.';
    };
    reader.onload = () => {
      const url = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        this.clearDroppedImage();
        this.droppedImage = img;
        this.droppedImageUrl = url;
        this.imageScale = 1.0;
        this.imageRotateDeg = 0;
        this.queueDraw();
      };
      img.onerror = () => {
        this.error = 'Impossible de charger l’image.';
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.clearDroppedImage();
    this.exportUrl = null;
    this.queueDraw();
  }

  private clearDroppedImage(): void {
    this.droppedImage = null;
    if (this.droppedImageUrl) {
      // Data URLs don't need revokeObjectURL; keep for parity if we later switch to object URLs.
      this.droppedImageUrl = null;
    }
  }

  queueDraw(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }

  private draw(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = this.canvasSize;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Background
    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, '#0b1020');
    bg.addColorStop(1, '#070a12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Soft glow
    const glow = ctx.createRadialGradient(size * 0.35, size * 0.25, 10, size * 0.35, size * 0.25, size * 0.65);
    glow.addColorStop(0, this.hexToRgba(this.accent, 0.20));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    if (this.ribbonStyle === 'CLASSIC') {
      this.drawRibbon(ctx, size);
    }

    this.drawMedal(ctx, size);
  }

  private drawRibbon(ctx: CanvasRenderingContext2D, size: number): void {
    const topY = 0;
    const midX = size / 2;
    const w = size * 0.22;
    const h = size * 0.32;

    ctx.save();
    ctx.globalAlpha = 0.98;

    // Left strap
    ctx.beginPath();
    ctx.moveTo(midX - w * 0.9, topY);
    ctx.lineTo(midX - w * 0.05, topY);
    ctx.lineTo(midX - w * 0.25, h);
    ctx.lineTo(midX - w * 1.1, h);
    ctx.closePath();
    const gradL = ctx.createLinearGradient(midX - w, topY, midX, h);
    gradL.addColorStop(0, this.ribbonLeft);
    gradL.addColorStop(1, '#0b1020');
    ctx.fillStyle = gradL;
    ctx.fill();

    // Right strap
    ctx.beginPath();
    ctx.moveTo(midX + w * 0.05, topY);
    ctx.lineTo(midX + w * 0.9, topY);
    ctx.lineTo(midX + w * 1.1, h);
    ctx.lineTo(midX + w * 0.25, h);
    ctx.closePath();
    const gradR = ctx.createLinearGradient(midX, topY, midX + w, h);
    gradR.addColorStop(0, this.ribbonRight);
    gradR.addColorStop(1, '#0b1020');
    ctx.fillStyle = gradR;
    ctx.fill();

    // Knot
    this.pathRoundRect(ctx, midX - 42, h - 26, 84, 52, 14);
    const knot = ctx.createLinearGradient(midX - 40, h - 26, midX + 40, h + 26);
    knot.addColorStop(0, this.hexToRgba(this.accent2, 0.25));
    knot.addColorStop(1, this.hexToRgba(this.accent, 0.10));
    ctx.fillStyle = knot;
    ctx.fill();

    ctx.restore();
  }

  private drawMedal(ctx: CanvasRenderingContext2D, size: number): void {
    const cx = size / 2;
    const cy = size * 0.58;
    const rOuter = size * 0.28;
    const rInner = rOuter * 0.78;
    const rImage = rInner * 0.76;

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.filter = 'blur(18px)';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.arc(cx, cy + 18, rOuter * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Outer ring
    ctx.save();
    const ringGrad = ctx.createRadialGradient(cx - rOuter * 0.35, cy - rOuter * 0.45, 10, cx, cy, rOuter);
    ringGrad.addColorStop(0, this.accent2);
    ringGrad.addColorStop(0.55, this.accent);
    ringGrad.addColorStop(1, '#704214');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.fill();

    // Outer ring highlight
    ctx.strokeStyle = this.hexToRgba('#ffffff', 0.16);
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter - 8, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
    ctx.restore();

    // Inner face
    ctx.save();
    const faceGrad = ctx.createLinearGradient(cx - rInner, cy - rInner, cx + rInner, cy + rInner);
    faceGrad.addColorStop(0, this.hexToRgba('#101827', 0.65));
    faceGrad.addColorStop(1, this.hexToRgba('#0b1020', 0.95));
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dropped image clipped inside
    if (this.droppedImage) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rImage, 0, Math.PI * 2);
      ctx.clip();

      const angle = (this.imageRotateDeg * Math.PI) / 180;
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      const img = this.droppedImage;
      const baseScale = Math.max((rImage * 2) / img.width, (rImage * 2) / img.height);
      const s = baseScale * Math.max(0.4, Math.min(3, this.imageScale));
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

      ctx.restore();

      // Subtle inner border
      ctx.save();
      ctx.strokeStyle = this.hexToRgba(this.accent2, 0.28);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, rImage + 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      // Placeholder icon
      ctx.save();
      ctx.fillStyle = this.hexToRgba(this.accent2, 0.22);
      ctx.strokeStyle = this.hexToRgba(this.accent2, 0.35);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, rImage, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = this.hexToRgba('#ffffff', 0.82);
      ctx.font = '700 44px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const letter = ((this.reward?.type ?? 'MEDAL').toString() || 'M').slice(0, 1);
      ctx.fillText(letter, cx, cy - 2);
      ctx.restore();
    }

    if (this.showText) {
      ctx.save();
      ctx.fillStyle = this.hexToRgba('#ffffff', 0.92);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      const title = (this.title || '').trim();
      const subtitle = (this.subtitle || '').trim();

      if (title) {
        ctx.font = '800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
        ctx.fillText(this.ellipsize(title, 18), cx, cy + rOuter + 58);
      }
      if (subtitle) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = this.hexToRgba(this.accent2, 0.85);
        ctx.font = '700 18px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
        ctx.fillText(this.ellipsize(subtitle, 26), cx, cy + rOuter + 86);
      }
      ctx.restore();
    }
  }

  exportPng(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.exportUrl = canvas.toDataURL('image/png');
    this.success = 'PNG prêt. Tu peux maintenant le sauvegarder.';
    this.error = '';
  }

  saveToReward(): void {
    if (!this.reward?.id || !this.exportUrl || this.saving) return;
    this.saving = true;
    this.error = '';
    this.success = '';
    this.rewards.updateReward(this.reward.id, {
      imageUrl: this.exportUrl,
      design: this.currentDesign()
    }).subscribe({
      next: r => {
        this.reward = r;
        this.saving = false;
        this.success = 'Design + image enregistrés dans la base (reward.imageUrl + reward.design).';
      },
      error: err => {
        console.error(err);
        this.saving = false;
        this.error = err?.error?.message || err?.message || 'Sauvegarde échouée.';
      }
    });
  }

  private currentDesign(): RewardDesign {
    return {
      version: 1,
      ribbonStyle: this.ribbonStyle,
      accent: this.accent,
      accent2: this.accent2,
      ribbonLeft: this.ribbonLeft,
      ribbonRight: this.ribbonRight,
      title: this.title,
      subtitle: this.subtitle,
      showText: this.showText,
      imageScale: this.imageScale,
      imageRotateDeg: this.imageRotateDeg,
      sourceImageUrl: this.droppedImageUrl || undefined,
      exportedAt: new Date().toISOString()
    };
  }

  private applyDesign(d: RewardDesign): void {
    if (d.ribbonStyle) this.ribbonStyle = d.ribbonStyle;
    if (d.accent) this.accent = d.accent;
    if (d.accent2) this.accent2 = d.accent2;
    if (d.ribbonLeft) this.ribbonLeft = d.ribbonLeft;
    if (d.ribbonRight) this.ribbonRight = d.ribbonRight;
    if (d.title !== undefined) this.title = d.title ?? '';
    if (d.subtitle !== undefined) this.subtitle = d.subtitle ?? '';
    if (d.showText !== undefined) this.showText = !!d.showText;
    if (typeof d.imageScale === 'number') this.imageScale = d.imageScale;
    if (typeof d.imageRotateDeg === 'number') this.imageRotateDeg = d.imageRotateDeg;

    const src = d.sourceImageUrl;
    if (src && typeof src === 'string' && src.startsWith('data:image/')) {
      const img = new Image();
      img.onload = () => {
        this.clearDroppedImage();
        this.droppedImage = img;
        this.droppedImageUrl = src;
        this.queueDraw();
      };
      img.onerror = () => {
        // If the stored source image is invalid, just ignore.
        this.queueDraw();
      };
      img.src = src;
    }
  }

  private ellipsize(s: string, max: number): string {
    if (s.length <= max) return s;
    return s.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = (hex || '').replace('#', '').trim();
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private pathRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }
}
