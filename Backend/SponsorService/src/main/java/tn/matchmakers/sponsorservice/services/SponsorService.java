package tn.matchmakers.sponsorservice.service;

import tn.matchmakers.sponsorservice.dto.SponsorRequestDTO;
import tn.matchmakers.sponsorservice.dto.SponsorResponseDTO;
import tn.matchmakers.sponsorservice.entity.SponsorStatus;
import java.util.List;

public interface SponsorService {
    SponsorResponseDTO createSponsor(SponsorRequestDTO dto);
    SponsorResponseDTO updateSponsor(String id, SponsorRequestDTO dto);
    SponsorResponseDTO getSponsorById(String id);
    SponsorResponseDTO getSponsorByUserId(String userId);
    List<SponsorResponseDTO> getAllSponsors();
    List<SponsorResponseDTO> getSponsorsByStatus(SponsorStatus status);
    SponsorResponseDTO approveSponsor(String id);
    SponsorResponseDTO rejectSponsor(String id, String adminNote);
    SponsorResponseDTO deactivateSponsor(String id);
    void deleteSponsor(String id);
    SponsorResponseDTO uploadLogo(String id, String logoUrl);
}