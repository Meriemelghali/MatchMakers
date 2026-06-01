import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AvatarConfig, AvatarConfigService } from '../../core/services/UserService/avatar-config.service';

@Component({
  selector: 'app-avatar-editor',
  templateUrl: './avatar-editor.component.html',
  styleUrls: ['./avatar-editor.component.css']
})
export class AvatarEditorComponent implements OnInit {
  @ViewChild('viewer') viewer!: ElementRef;
  @Input() initialConfig?: AvatarConfig;
  @Output() saved = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  config!: AvatarConfig;
  models = {
    male: 'assets/avatars/base-male.glb',
    female: 'assets/avatars/base-female.glb'
  };
  currentModelUrl = '';

  // Accessoires selon le sport
  props: Record<string, string> = {
    'football': '⚽',
    'basketball': '🏀',
    'tennis': '🎾',
    'cycling': '🚲',
    'running': '👟'
  };

  constructor(public avatarConfigService: AvatarConfigService) {}

  ngOnInit() {
    this.config = this.initialConfig 
      ? { ...this.initialConfig }
      : { ...this.avatarConfigService.defaultConfig };
    this.updateModel();
  }

  updateModel() {
    this.currentModelUrl = this.config.gender === 'male' ? this.models.male : this.models.female;
  }

  onModelLoad() {
    this.applyAllColors();
  }

  applyAllColors() {
    // On force la couleur sur TOUS les matériaux si on ne connaît pas les noms
    this.applyColorToMaterials(['skin', 'body', 'head', 'face', 'arm', 'leg', 'hand'], this.config.skinColor);
    this.applyColorToMaterials(['hair'], this.config.hairColor);
    this.applyColorToMaterials(['shirt', 'outfit', 'cloth', 'jersey', 'top', 'suit', 'pants', 'bottom', 'footwear', 'shoes'], this.config.primaryColor);
    
    // Si le modèle est encore trop blanc, on colorie les matériaux par défaut
    this.forceColorOnUnknown();
  }

  private forceColorOnUnknown() {
    const el = this.viewer?.nativeElement as any;
    if (!el || !el.model) return;
    const rgbSkin = this.hexToRgbArray(this.config.skinColor);
    const rgbCloth = this.hexToRgbArray(this.config.primaryColor);

    el.model.materials.forEach((m: any, index: number) => {
      // Souvent dans les modèles RPM, l'index 0 ou 1 est la peau, le reste les vêtements
      if (index === 0) m.pbrMetallicRoughness.setBaseColorFactor(rgbSkin);
      else m.pbrMetallicRoughness.setBaseColorFactor(rgbCloth);
    });
  }

  private applyColorToMaterials(keywords: string[], color: string) {
    const el = this.viewer?.nativeElement as any;
    if (!el || !el.model) return;
    const rgb = this.hexToRgbArray(color);
    el.model.materials.forEach((material: any) => {
      const name = (material.name || '').toLowerCase();
      if (keywords.some(key => name.includes(key))) {
        material.pbrMetallicRoughness.setBaseColorFactor(rgb);
      }
    });
  }

  setGender(gender: 'male' | 'female') {
    this.config.gender = gender;
    this.updateModel();
  }

  setSkinColor(color: string) {
    this.config.skinColor = color;
    this.applyAllColors();
  }

  setHairColor(color: string) {
    this.config.hairColor = color;
    this.applyAllColors();
  }

  setPrimaryColor(color: string) {
    this.config.primaryColor = color;
    this.applyAllColors();
  }

  setOutfit(outfit: string) {
    this.config.outfit = outfit as any;
  }

  private hexToRgbArray(hex: string): [number, number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b, 1.0];
  }

  save() {
    this.saved.emit(this.currentModelUrl);
  }
}