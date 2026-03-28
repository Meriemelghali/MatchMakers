export interface SportCategory {
  id: string;
  nameSportC: string;
}

export interface Sport {
  id: string;
  nameSport: string;
  minPlayers: number;
  maxPlayers: number;
  sportCategories: SportCategory[];
}