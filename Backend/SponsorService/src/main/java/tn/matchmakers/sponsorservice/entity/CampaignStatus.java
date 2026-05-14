package tn.matchmakers.sponsorservice.entity;

public enum CampaignStatus {
    PENDING,   // en attente validation admin
    ACTIVE,    // campagne en cours
    PAUSED,    // mise en pause
    EXPIRED,   // date de fin dépassée
    CANCELLED  // annulée
}