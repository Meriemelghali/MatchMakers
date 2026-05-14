export enum SponsorStatus {
  PENDING  = 'PENDING',
  ACTIVE   = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REJECTED = 'REJECTED'
}


export interface Sponsor {
  id?:          string;
  userId:       string;
  userEmail:    string;
  companyName:  string;
  description:  string;
  logoUrl?:     string;
  website?:     string;
  contactEmail: string;
  contactPhone?: string;
  targetSport?: string;
  status:       SponsorStatus;   // ← obligatoire, pas optionnel
  adminNote?:   string;
  approvedAt?:  string;
  createdAt?:   string;
  updatedAt?:   string;
}


export interface SponsorRequest {
  userId:       string;
  userEmail:    string;
  companyName:  string;
  description:  string;
  logoUrl?:     string;
  website?:     string;
  contactEmail: string;
  contactPhone: string;
  targetSport?: string;
}
export enum CampaignStatus {
  PENDING   = 'PENDING',
  ACTIVE    = 'ACTIVE',
  PAUSED    = 'PAUSED',
  EXPIRED   = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum CampaignTarget {
  PRODUCT = 'PRODUCT',
  EVENT   = 'EVENT',
  GLOBAL  = 'GLOBAL'
}

export enum CampaignPosition {
  TOP      = 'TOP',
  FEATURED = 'FEATURED',
  BANNER   = 'BANNER',
  SIDEBAR  = 'SIDEBAR'
}
export interface Campaign {
  id?:            string;
  sponsorId:      string;
  sponsorName?:   string;
  campaignName:   string;      // ✅ Modifié (Backend attend campaignName)
  description:    string;
  sponsorLogoUrl?: string;
  target:         CampaignTarget;
  targetId?:      string;
  targetUrl?:     string;
  targetSport?:   string;
  budget?:        number;
  targetName?:    string;
  badge?:         string;
  position?:      CampaignPosition;
  bannerUrl?:     string;
  startDate:      string;
  endDate:        string;
  status?:        CampaignStatus;
  adminNote?:     string;
  views?:         number;
  clicks?:        number;
  createdAt?:     string;
  updatedAt?:     string;
  budgetSpent?: number;
}

export interface CampaignRequest { 
  sponsorId:      string;
  campaignName:   string;
  description?:   string;
  bannerUrl?:     string;
  target:         CampaignTarget;
  targetId?:      string;
  targetUrl?:     string;
  targetSport?:   string;
  startDate:      string;
  endDate:        string;
  badge?:         string;
  position?:      CampaignPosition;
  budget?:        number;
}