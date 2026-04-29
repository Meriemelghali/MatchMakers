import { Injectable } from '@angular/core';

export interface AvatarSuggestion {
  id: string;
  name: string;
  url: string;
  sportCategory: string;
  description: string;
  gender?: 'male' | 'female' | 'neutral';
}

@Injectable({ providedIn: 'root' })
export class AvatarService {

  /**
   * Bibliothèque d'avatars par sport.
   * IMPORTANT : Remplace ces URLs par TES propres avatars créés sur 
   * https://readyplayer.me — crée 2-3 avatars par sport (M/F) puis copie 
   * leur URL .glb depuis "My Avatars".
   */
  private readonly avatarLibrary: Record<string, AvatarSuggestion[]> = {
    football: [
      {
        id: 'foot-m-1',
        name: 'Footballeur Pro',
        url: 'https://models.readyplayer.me/REPLACE_FOOT_M.glb',
        sportCategory: 'football',
        description: 'Maillot et short de match',
        gender: 'male'
      },
      {
        id: 'foot-f-1',
        name: 'Footballeuse',
        url: 'https://models.readyplayer.me/REPLACE_FOOT_F.glb',
        sportCategory: 'football',
        description: 'Tenue de compétition',
        gender: 'female'
      }
    ],
    basketball: [
      {
        id: 'bball-m-1',
        name: 'Basketteur',
        url: 'https://models.readyplayer.me/REPLACE_BBALL_M.glb',
        sportCategory: 'basketball',
        description: 'Jersey NBA-style',
        gender: 'male'
      }
    ],
    tennis: [
      {
        id: 'tennis-1',
        name: 'Joueur de Tennis',
        url: 'https://models.readyplayer.me/REPLACE_TENNIS.glb',
        sportCategory: 'tennis',
        description: 'Polo et short blanc',
        gender: 'neutral'
      }
    ],
    running: [
      {
        id: 'run-1',
        name: 'Coureur',
        url: 'https://models.readyplayer.me/REPLACE_RUN.glb',
        sportCategory: 'running',
        description: 'Tenue de running légère',
        gender: 'neutral'
      }
    ],
    cycling: [
      {
        id: 'cycle-1',
        name: 'Cycliste',
        url: 'https://models.readyplayer.me/REPLACE_CYCLE.glb',
        sportCategory: 'cycling',
        description: 'Maillot et cuissard',
        gender: 'neutral'
      }
    ],
    fitness: [
      {
        id: 'fit-1',
        name: 'Athlète Fitness',
        url: 'https://models.readyplayer.me/REPLACE_FIT.glb',
        sportCategory: 'fitness',
        description: 'Tenue de salle de sport',
        gender: 'neutral'
      }
    ],
    // Fallback pour les sports non mappés
    default: [
      {
        id: 'default-1',
        name: 'Athlète Polyvalent',
        url: 'https://models.readyplayer.me/REPLACE_DEFAULT_1.glb',
        sportCategory: 'general',
        description: 'Style sportswear',
        gender: 'neutral'
      },
      {
        id: 'default-2',
        name: 'Style Casual',
        url: 'https://models.readyplayer.me/REPLACE_DEFAULT_2.glb',
        sportCategory: 'general',
        description: 'Look décontracté',
        gender: 'neutral'
      }
    ]
  };

  /**
   * Génère 4-6 suggestions personnalisées selon les sports favoris du user.
   */
  getSuggestionsForUser(favoriteSports: string[] = []): AvatarSuggestion[] {
    const suggestions: AvatarSuggestion[] = [];
    const seen = new Set<string>();

    // 1. Avatars matchant les sports favoris (priorité)
    favoriteSports.forEach(sport => {
      const key = this.normalizeSportName(sport);
      const matches = this.avatarLibrary[key] || [];
      matches.forEach(avatar => {
        if (!seen.has(avatar.id)) {
          suggestions.push({ ...avatar, sportCategory: sport });
          seen.add(avatar.id);
        }
      });
    });

    // 2. Compléter avec defaults si moins de 4 suggestions
    if (suggestions.length < 4) {
      this.avatarLibrary['default'].forEach(avatar => {
        if (!seen.has(avatar.id) && suggestions.length < 6) {
          suggestions.push(avatar);
          seen.add(avatar.id);
        }
      });
    }

    return suggestions.slice(0, 6);
  }

  /**
   * Normalise les noms de sports pour le matching (FR/EN, casse, accents).
   */
  private normalizeSportName(sport: string): string {
    const normalized = sport
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // Mapping FR -> clés
    const aliases: Record<string, string> = {
      'foot': 'football',
      'soccer': 'football',
      'basket': 'basketball',
      'course': 'running',
      'jogging': 'running',
      'velo': 'cycling',
      'cyclisme': 'cycling',
      'musculation': 'fitness',
      'gym': 'fitness',
      'crossfit': 'fitness'
    };

    return aliases[normalized] || normalized;
  }

  /**
   * URL de l'iframe RPM Custom Creator avec params optimisés.
   */
  getCustomCreatorUrl(): string {
    // ⚠️ Remplace 'your-subdomain' par ton vrai subdomain RPM
    const subdomain = 'your-subdomain'; // ex: 'matchmakers'
    const params = new URLSearchParams({
      frameApi: 'true',
      bodyType: 'fullbody',
      clearCache: 'true',
      quickStart: 'false'
    });
    return `https://${subdomain}.readyplayer.me/avatar?${params.toString()}`;
  }
}