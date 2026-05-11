import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface WeatherForecast {
  temp:            number;
  windSpeed:       number;
  rainProbability: number;
  weatherCode:     number;
  description:     string;
  emoji:           string;
  alertLevel:      'ok' | 'warning' | 'danger';
  alertMessage:    string | null;
  recommendations: string[];
}

interface OpenMeteoResponse {
  hourly: {
    time:                      string[];
    temperature_2m:            number[];
    precipitation_probability: number[];
    weathercode:               number[];
    windspeed_10m:             number[];
  };
}

// WMO Weather Interpretation Codes → [French description, emoji]
const WMO: Record<number, [string, string]> = {
  0:  ['Ciel dégagé',              '☀️'],
  1:  ['Principalement dégagé',    '🌤️'],
  2:  ['Partiellement nuageux',    '⛅'],
  3:  ['Couvert',                  '☁️'],
  45: ['Brouillard',               '🌫️'],
  48: ['Brouillard givrant',       '🌫️'],
  51: ['Bruine légère',            '🌦️'],
  53: ['Bruine modérée',           '🌦️'],
  55: ['Bruine dense',             '🌧️'],
  61: ['Pluie légère',             '🌧️'],
  63: ['Pluie modérée',            '🌧️'],
  65: ['Pluie forte',              '🌧️'],
  66: ['Pluie verglaçante légère', '🌨️'],
  67: ['Pluie verglaçante forte',  '🌨️'],
  71: ['Neige légère',             '❄️'],
  73: ['Neige modérée',            '❄️'],
  75: ['Neige forte',              '❄️'],
  77: ['Grains de neige',          '❄️'],
  80: ['Averses légères',          '🌦️'],
  81: ['Averses modérées',         '🌦️'],
  82: ['Averses fortes',           '🌧️'],
  85: ['Averses de neige',         '❄️'],
  86: ['Averses de neige fortes',  '❄️'],
  95: ['Orage',                    '⛈️'],
  96: ['Orage avec grêle',         '⛈️'],
  99: ['Orage avec forte grêle',   '⛈️'],
};

// Surface types that are sensitive to rain
const SENSITIVE_SURFACES = new Set(['GAZON_NATUREL', 'TERRE_BATTUE']);
const INDOOR_SURFACES    = new Set(['PARQUET']);

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly API = 'https://api.open-meteo.com/v1/forecast';

  constructor(private http: HttpClient) {}

  getForecast(lat: number, lon: number, matchDate: string, surfaceType?: string): Observable<WeatherForecast | null> {
    const params = {
      latitude:      lat.toString(),
      longitude:     lon.toString(),
      hourly:        'temperature_2m,precipitation_probability,weathercode,windspeed_10m',
      timezone:      'auto',
      forecast_days: '7',
    };
    return this.http.get<OpenMeteoResponse>(this.API, { params }).pipe(
      map(res => this.extract(res, matchDate, surfaceType)),
      catchError(() => of(null))
    );
  }

  private extract(res: OpenMeteoResponse, matchDate: string, surfaceType?: string): WeatherForecast | null {
    const times = res.hourly?.time;
    if (!times?.length) return null;

    // Find the hourly slot closest to match start
    const target = new Date(matchDate).getTime();
    let bestIdx = 0, bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i]).getTime() - target);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    }

    const code = res.hourly.weathercode[bestIdx]               ?? 0;
    const temp = Math.round(res.hourly.temperature_2m[bestIdx] ?? 0);
    const wind = Math.round(res.hourly.windspeed_10m[bestIdx]  ?? 0);
    const rain = res.hourly.precipitation_probability[bestIdx]  ?? 0;

    // Graceful WMO fallback — find closest known code
    const [description, emoji] = WMO[code] ?? WMO[this.nearestCode(code)] ?? ['Conditions variables', '🌡️'];

    const isRainy    = [51,53,55,61,63,65,66,67,80,81,82,95,96,99].includes(code) || rain >= 40;
    const isStorm    = code >= 95;
    const isSnow     = [71,73,75,77,85,86].includes(code);
    const isHeavyWet = [65,67,82].includes(code) || rain >= 65;
    const isFoggy    = [45,48].includes(code);
    const isWindy    = wind >= 30;
    const isHot      = temp >= 38;
    const isCold     = temp <= 2;
    const isSensitive = surfaceType && SENSITIVE_SURFACES.has(surfaceType);
    const isIndoor    = surfaceType && INDOOR_SURFACES.has(surfaceType);

    // ── Alert level ───────────────────────────────────────────────────────────
    let alertLevel:   WeatherForecast['alertLevel'] = 'ok';
    let alertMessage: string | null = null;

    if (isStorm) {
      alertLevel   = 'danger';
      alertMessage = 'Orage violent prévu — report du match fortement recommandé';
    } else if (isSnow) {
      alertLevel   = 'danger';
      alertMessage = 'Chutes de neige prévues — conditions dangereuses pour les joueurs';
    } else if (isHeavyWet && isSensitive) {
      alertLevel   = 'danger';
      alertMessage = `Fortes pluies sur ${this.surfaceLabel(surfaceType)} — terrain potentiellement impraticable`;
    } else if (isHeavyWet) {
      alertLevel   = 'warning';
      alertMessage = 'Pluies intenses prévues — prévoir un plan de secours';
    } else if (isRainy && isSensitive) {
      alertLevel   = 'warning';
      alertMessage = `Pluie sur ${this.surfaceLabel(surfaceType)} — terrain glissant à prévoir`;
    } else if (isRainy) {
      alertLevel   = 'warning';
      alertMessage = 'Pluie probable — adapter l\'équipement des joueurs';
    } else if (isWindy && wind >= 50) {
      alertLevel   = 'warning';
      alertMessage = `Vent très fort (${wind} km/h) — conditions de jeu difficiles`;
    } else if (isWindy) {
      alertLevel   = 'warning';
      alertMessage = `Vent soutenu (${wind} km/h) — peut affecter les trajectoires de balle`;
    } else if (isHot) {
      alertLevel   = 'warning';
      alertMessage = `Chaleur intense (${temp}°C) — risque de déshydratation`;
    } else if (isFoggy) {
      alertLevel   = 'warning';
      alertMessage = 'Brouillard prévu — visibilité réduite sur le terrain';
    }

    // ── Recommendations ───────────────────────────────────────────────────────
    const recs: string[] = [];

    if (isIndoor) {
      recs.push('Surface intérieure — conditions météo n\'affectent pas le terrain');
    } else {
      if (isStorm || isSnow) {
        recs.push('Reporter ou déplacer le match dans une salle couverte');
        recs.push('Consulter l\'évolution météo 3h avant le coup d\'envoi');
      }
      if (isRainy || isHeavyWet) {
        if (surfaceType === 'GAZON_NATUREL')     recs.push('Gazon naturel : prévoir des crampons longs, vérifier le drainage');
        if (surfaceType === 'TERRE_BATTUE')       recs.push('Terre battue : terrain boueux attendu, envisager un report');
        if (surfaceType === 'GAZON_SYNTHETIQUE')  recs.push('Gazon synthétique : reste praticable mais glissant, semelles adaptées');
        if (surfaceType === 'BETON' || surfaceType === 'TARTAN') recs.push('Surface dure : très glissante sous la pluie, attention aux chutes');
        recs.push('Prévoir des maillots de rechange et des protections imperméables');
        recs.push('Inspecter l\'état du terrain 1h avant le match');
      }
      if (isWindy) {
        recs.push('Vent : adapter les stratégies de coup de pied arrêté et les corners');
      }
      if (isHot) {
        recs.push(`Chaleur ${temp}°C : prévoir 2× plus d'eau, pauses hydratation conseillées`);
        recs.push('Planifier des substitutions plus fréquentes pour éviter l\'épuisement');
      }
      if (isCold) {
        recs.push(`Froid (${temp}°C) : échauffement prolongé obligatoire, équipements thermiques`);
      }
      if (isFoggy) {
        recs.push('Brouillard : vérifier si la visibilité sera suffisante pour les arbitres');
      }
    }

    if (!recs.length) {
      recs.push('Conditions favorables — aucune précaution particulière requise');
      if (temp >= 20 && temp <= 28 && !isRainy) {
        recs.push('Météo idéale pour un excellent match !');
      }
    }

    return { temp, windSpeed: wind, rainProbability: rain, weatherCode: code, description, emoji, alertLevel, alertMessage, recommendations: recs };
  }

  private nearestCode(code: number): number {
    const known = Object.keys(WMO).map(Number);
    return known.reduce((a, b) => Math.abs(b - code) < Math.abs(a - code) ? b : a);
  }

  private surfaceLabel(surface?: string): string {
    const map: Record<string, string> = {
      GAZON_NATUREL:     'gazon naturel',
      GAZON_SYNTHETIQUE: 'gazon synthétique',
      TERRE_BATTUE:      'terre battue',
      BETON:             'béton',
      TARTAN:            'tartan',
      PARQUET:           'parquet',
    };
    return surface ? (map[surface] ?? surface.toLowerCase()) : 'ce terrain';
  }
}
