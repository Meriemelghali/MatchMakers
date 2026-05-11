export interface Reclamation {
  id?: string;
  title: string;
  description: string;
  type?: string; // COMPORTEMENT, PAIEMENT, TECHNIQUE
  urgence?: string; // HAUTE, MOYENNE, BASSE
  status?: string; // PENDING, RESOLVED, REJECTED, AUTO_RESOLVED, ALERTE_ADMIN
  matchId?: string;
  userId?: string;
  targetUserId?: string;
  aiResponse?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sanction {
  id?: string;
  userId: string;
  reclamationId?: string;
  typeSanction: string; // WARNING, BAN_1_JOUR, BAN_DEFINITIF
  motif: string;
  createdAt?: string;
}
