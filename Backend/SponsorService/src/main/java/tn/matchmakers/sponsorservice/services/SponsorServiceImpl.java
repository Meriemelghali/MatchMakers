package tn.matchmakers.sponsorservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.sponsorservice.dto.SponsorRequestDTO;
import tn.matchmakers.sponsorservice.dto.SponsorResponseDTO;
import tn.matchmakers.sponsorservice.entity.Sponsor;
import tn.matchmakers.sponsorservice.entity.SponsorStatus;
import tn.matchmakers.sponsorservice.repository.SponsorRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SponsorServiceImpl implements SponsorService {

    private final SponsorRepository sponsorRepository;

    @Override
    public SponsorResponseDTO createSponsor(SponsorRequestDTO dto) {
        if (sponsorRepository.existsByUserId(dto.getUserId()))
            throw new RuntimeException("Ce user a déjà un profil sponsor");

        Sponsor sponsor = Sponsor.builder()
            .userId(dto.getUserId())
            .userEmail(dto.getUserEmail())
            .companyName(dto.getCompanyName())
            .description(dto.getDescription())
            .logoUrl(dto.getLogoUrl())
            .website(dto.getWebsite())
            .contactEmail(dto.getContactEmail())
            .contactPhone(dto.getContactPhone())
            .targetSport(dto.getTargetSport())
            .status(SponsorStatus.PENDING)
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build();

        return toDTO(sponsorRepository.save(sponsor));
    }

    @Override
    public SponsorResponseDTO updateSponsor(String id, SponsorRequestDTO dto) {
        Sponsor sponsor = findById(id);
        sponsor.setCompanyName(dto.getCompanyName());
        sponsor.setDescription(dto.getDescription());
        sponsor.setLogoUrl(dto.getLogoUrl());
        sponsor.setWebsite(dto.getWebsite());
        sponsor.setContactEmail(dto.getContactEmail());
        sponsor.setContactPhone(dto.getContactPhone());
        sponsor.setTargetSport(dto.getTargetSport());
        sponsor.setUpdatedAt(LocalDateTime.now());
        return toDTO(sponsorRepository.save(sponsor));
    }

    @Override
    public SponsorResponseDTO getSponsorById(String id) {
        return toDTO(findById(id));
    }

    @Override
    public SponsorResponseDTO getSponsorByUserId(String userId) {
        return sponsorRepository.findByUserId(userId)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Aucun profil sponsor pour ce user"));
    }

    @Override
    public List<SponsorResponseDTO> getAllSponsors() {
        return sponsorRepository.findAll()
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<SponsorResponseDTO> getSponsorsByStatus(SponsorStatus status) {
        return sponsorRepository.findByStatus(status)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public SponsorResponseDTO approveSponsor(String id) {
        Sponsor sponsor = findById(id);
        sponsor.setStatus(SponsorStatus.ACTIVE);
        sponsor.setAdminNote(null);
        sponsor.setApprovedAt(LocalDateTime.now());
        sponsor.setUpdatedAt(LocalDateTime.now());
        return toDTO(sponsorRepository.save(sponsor));
    }

    @Override
    public SponsorResponseDTO rejectSponsor(String id, String adminNote) {
        Sponsor sponsor = findById(id);
        sponsor.setStatus(SponsorStatus.REJECTED);
        sponsor.setAdminNote(adminNote);
        sponsor.setUpdatedAt(LocalDateTime.now());
        return toDTO(sponsorRepository.save(sponsor));
    }

    @Override
    public SponsorResponseDTO deactivateSponsor(String id) {
        Sponsor sponsor = findById(id);
        sponsor.setStatus(SponsorStatus.INACTIVE);
        sponsor.setUpdatedAt(LocalDateTime.now());
        return toDTO(sponsorRepository.save(sponsor));
    }

    @Override
    public void deleteSponsor(String id) {
        if (!sponsorRepository.existsById(id))
            throw new RuntimeException("Sponsor introuvable : " + id);
        sponsorRepository.deleteById(id);
    }

    @Override
    public SponsorResponseDTO uploadLogo(String id, String logoUrl) {
        Sponsor sponsor = findById(id);
        sponsor.setLogoUrl(logoUrl);
        sponsor.setUpdatedAt(LocalDateTime.now());
        return toDTO(sponsorRepository.save(sponsor));
    }

    private Sponsor findById(String id) {
        return sponsorRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Sponsor introuvable : " + id));
    }

    private SponsorResponseDTO toDTO(Sponsor s) {
        return SponsorResponseDTO.builder()
            .id(s.getId())
            .userId(s.getUserId())
            .userEmail(s.getUserEmail())
            .companyName(s.getCompanyName())
            .description(s.getDescription())
            .logoUrl(s.getLogoUrl())
            .website(s.getWebsite())
            .contactEmail(s.getContactEmail())
            .contactPhone(s.getContactPhone())
            .targetSport(s.getTargetSport())
            .status(s.getStatus())
            .adminNote(s.getAdminNote())
            .approvedAt(s.getApprovedAt())
            .createdAt(s.getCreatedAt())
            .updatedAt(s.getUpdatedAt())
            .build();
    }
}