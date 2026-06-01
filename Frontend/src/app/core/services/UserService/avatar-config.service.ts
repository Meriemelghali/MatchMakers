// src/app/core/services/UserService/avatar-config.service.ts
import { Injectable } from '@angular/core';

export interface AvatarConfig {
  gender: 'male' | 'female';
  skinColor: string;
  hairStyle: 'short' | 'medium' | 'long' | 'buzz';
  hairColor: string;
  outfit: 'football' | 'basketball' | 'tennis' | 'running' | 'cycling' | 'casual';
  primaryColor: string;   // Couleur principale du maillot
  secondaryColor: string; // Couleur secondaire
  number?: string;        // Numéro de maillot (foot/basket)
}

@Injectable({ providedIn: 'root' })
export class AvatarConfigService {
  
  readonly defaultConfig: AvatarConfig = {
    gender: 'male',
    skinColor: '#F5D5A0',
    hairStyle: 'short',
    hairColor: '#3D2817',
    outfit: 'casual',
    primaryColor: '#E8500A',
    secondaryColor: '#000000',
    number: '10'
  };

  readonly skinColors = [
    { name: 'Très clair', value: '#FDE7D6' },
    { name: 'Clair', value: '#F5D5A0' },
    { name: 'Mat', value: '#D4A574' },
    { name: 'Bronzé', value: '#A67852' },
    { name: 'Foncé', value: '#6B4423' },
    { name: 'Très foncé', value: '#3D2817' }
  ];

  readonly hairColors = [
    { name: 'Noir', value: '#1A1A1A' },
    { name: 'Brun foncé', value: '#3D2817' },
    { name: 'Châtain', value: '#6B4423' },
    { name: 'Blond', value: '#D4B17A' },
    { name: 'Roux', value: '#A0522D' },
    { name: 'Gris', value: '#808080' },
    { name: 'Blanc', value: '#F5F5F5' }
  ];

  readonly hairStyles = [
    { name: 'Court', value: 'short', icon: 'fa-cut' },
    { name: 'Moyen', value: 'medium', icon: 'fa-user' },
    { name: 'Long', value: 'long', icon: 'fa-user-tie' },
    { name: 'Rasé', value: 'buzz', icon: 'fa-circle' }
  ];

  /** Génère une config par défaut basée sur les sports favoris */
  getConfigForUser(favoriteSports: string[] = []): AvatarConfig {
    const config = { ...this.defaultConfig };
    
    if (favoriteSports.length > 0) {
      const primarySport = favoriteSports[0].toLowerCase();
      
      const sportMap: Record<string, Partial<AvatarConfig>> = {
        'football': { outfit: 'football', primaryColor: '#E8500A' },
        'basketball': { outfit: 'basketball', primaryColor: '#FF6B35' },
        'tennis': { outfit: 'tennis', primaryColor: '#FFFFFF', secondaryColor: '#10B981' },
        'running': { outfit: 'running', primaryColor: '#3B82F6' },
        'course': { outfit: 'running', primaryColor: '#3B82F6' }
      };

      Object.assign(config, sportMap[primarySport] || {});
    }

    return config;
  }
}