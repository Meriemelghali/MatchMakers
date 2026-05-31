package tn.matchmakers.sponsorservice.service;

import tn.matchmakers.sponsorservice.dto.CampaignRequestDTO;
import tn.matchmakers.sponsorservice.dto.CampaignResponseDTO;
import java.util.List;

public interface CampaignService {
    CampaignResponseDTO createCampaign(CampaignRequestDTO dto);
    CampaignResponseDTO updateCampaign(String id, CampaignRequestDTO dto);
    void deleteCampaign(String id);
    CampaignResponseDTO getCampaignById(String id);
    List<CampaignResponseDTO> getAllCampaigns();
    List<CampaignResponseDTO> getCampaignsBySponsor(String sponsorId);
    List<CampaignResponseDTO> getActiveCampaigns();
    List<CampaignResponseDTO> getActiveForProduct(String productId);
    List<CampaignResponseDTO> getActiveGlobal();
    CampaignResponseDTO approveCampaign(String id);
    CampaignResponseDTO rejectCampaign(String id, String adminNote);
    CampaignResponseDTO pauseCampaign(String id);
    CampaignResponseDTO resumeCampaign(String id);
    CampaignResponseDTO trackView(String id);
    CampaignResponseDTO trackClick(String id);
}