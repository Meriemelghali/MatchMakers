package tn.matchmakers.sponsorservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.sponsorservice.dto.CampaignRequestDTO;
import tn.matchmakers.sponsorservice.dto.CampaignResponseDTO;
import tn.matchmakers.sponsorservice.entity.*;
import tn.matchmakers.sponsorservice.repository.CampaignRepository;
import tn.matchmakers.sponsorservice.repository.SponsorRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampaignServiceImpl implements CampaignService {

    private final CampaignRepository campaignRepository;
    private final SponsorRepository  sponsorRepository;

    @Override
    public CampaignResponseDTO createCampaign(CampaignRequestDTO dto) {
        Sponsor sponsor = sponsorRepository.findById(dto.getSponsorId())
            .orElseThrow(() -> new RuntimeException("Sponsor introuvable"));

       // if (sponsor.getStatus() != SponsorStatus.ACTIVE)
         //   throw new RuntimeException("Sponsor non actif — en attente de validation");

        Campaign campaign = Campaign.builder()
            .sponsorId(dto.getSponsorId())
            .sponsorName(sponsor.getCompanyName())
            .sponsorLogoUrl(sponsor.getLogoUrl())
            .target(dto.getTarget())
            .targetId(dto.getTargetId())
            .targetName(dto.getTargetName())
            .campaignName(dto.getCampaignName())
            .targetUrl(dto.getTargetUrl())
            .description(dto.getDescription())
            .budget(dto.getBudget())
            .targetSport(dto.getTargetSport())
            .badge(dto.getBadge() != null ? dto.getBadge() : "Sponsorisé")
            .position(dto.getPosition() != null ? dto.getPosition() : CampaignPosition.FEATURED)
            .bannerUrl(dto.getBannerUrl())
            .startDate(dto.getStartDate())
            .endDate(dto.getEndDate())
            .status(CampaignStatus.PENDING)
            .views(0)
            .clicks(0)
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
             .budget(dto.getBudget())      // ✅
             .budgetSpent(0.0)  
            .build();

        return toDTO(campaignRepository.save(campaign));
    }

    @Override
    public CampaignResponseDTO updateCampaign(String id, CampaignRequestDTO dto) {
        Campaign c = findById(id);
        c.setTarget(dto.getTarget());
        c.setTargetId(dto.getTargetId());
        c.setTargetName(dto.getTargetName());
        c.setCampaignName(dto.getCampaignName());
        c.setTargetUrl(dto.getTargetUrl());
        c.setDescription(dto.getDescription());
        c.setBudget(dto.getBudget());
        c.setTargetSport(dto.getTargetSport());
        c.setBadge(dto.getBadge());
        c.setPosition(dto.getPosition());
        c.setBannerUrl(dto.getBannerUrl());
        c.setStartDate(dto.getStartDate());
        c.setEndDate(dto.getEndDate());
        c.setUpdatedAt(LocalDateTime.now());
        c.setBudget(dto.getBudget());    // ✅
        c.setBudgetSpent(dto.getBudgetSpent()); // ✅
        return toDTO(campaignRepository.save(c));
    }

    @Override
    public void deleteCampaign(String id) {
        if (!campaignRepository.existsById(id))
            throw new RuntimeException("Campagne introuvable");
        campaignRepository.deleteById(id);
    }

    @Override
    public CampaignResponseDTO getCampaignById(String id) {
        return toDTO(findById(id));
    }

    @Override
    public List<CampaignResponseDTO> getAllCampaigns() {
        return campaignRepository.findAll()
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<CampaignResponseDTO> getCampaignsBySponsor(String sponsorId) {
        return campaignRepository.findBySponsorId(sponsorId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<CampaignResponseDTO> getActiveCampaigns() {
        return campaignRepository.findActiveCampaigns(LocalDateTime.now())
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<CampaignResponseDTO> getActiveForProduct(String productId) {
        return campaignRepository.findActiveForProduct(productId, LocalDateTime.now())
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<CampaignResponseDTO> getActiveGlobal() {
        return campaignRepository.findActiveGlobal(LocalDateTime.now())
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public CampaignResponseDTO approveCampaign(String id) {
        Campaign c = findById(id);
        c.setStatus(CampaignStatus.ACTIVE);
        c.setAdminNote(null);
        c.setUpdatedAt(LocalDateTime.now());
        return toDTO(campaignRepository.save(c));
    }

    @Override
    public CampaignResponseDTO rejectCampaign(String id, String adminNote) {
        Campaign c = findById(id);
        c.setStatus(CampaignStatus.CANCELLED);
        c.setAdminNote(adminNote);
        c.setUpdatedAt(LocalDateTime.now());
        return toDTO(campaignRepository.save(c));
    }

    @Override
    public CampaignResponseDTO pauseCampaign(String id) {
        Campaign c = findById(id);
        c.setStatus(CampaignStatus.PAUSED);
        c.setUpdatedAt(LocalDateTime.now());
        return toDTO(campaignRepository.save(c));
    }

    @Override
    public CampaignResponseDTO resumeCampaign(String id) {
        Campaign c = findById(id);
        c.setStatus(CampaignStatus.ACTIVE);
        c.setUpdatedAt(LocalDateTime.now());
        return toDTO(campaignRepository.save(c));
    }

    @Override
    public CampaignResponseDTO trackView(String id) {
        Campaign c = findById(id);
        c.setViews(c.getViews() + 1);
        return toDTO(campaignRepository.save(c));
    }

    @Override
    public CampaignResponseDTO trackClick(String id) {
        Campaign c = findById(id);
        c.setClicks(c.getClicks() + 1);
        return toDTO(campaignRepository.save(c));
    }

    private Campaign findById(String id) {
        return campaignRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Campagne introuvable : " + id));
    }

    private CampaignResponseDTO toDTO(Campaign c) {
        return CampaignResponseDTO.builder()
            .id(c.getId())
            .sponsorId(c.getSponsorId())
            .sponsorName(c.getSponsorName())
            .sponsorLogoUrl(c.getSponsorLogoUrl())
            .target(c.getTarget())
            .targetId(c.getTargetId())
            .targetName(c.getTargetName())
            .campaignName(c.getCampaignName())
            .targetUrl(c.getTargetUrl())
            .description(c.getDescription())
            .budget(c.getBudget())
            .targetSport(c.getTargetSport())
            .badge(c.getBadge())
            .position(c.getPosition())
            .bannerUrl(c.getBannerUrl())
            .startDate(c.getStartDate())
            .endDate(c.getEndDate())
            .status(c.getStatus())
            .adminNote(c.getAdminNote())
            .views(c.getViews())
            .clicks(c.getClicks())
            .createdAt(c.getCreatedAt())
            .updatedAt(c.getUpdatedAt())
            .build();
    }
}