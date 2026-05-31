package tn.matchmakers.sponsorservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.sponsorservice.dto.CampaignRequestDTO;
import tn.matchmakers.sponsorservice.dto.CampaignResponseDTO;
import tn.matchmakers.sponsorservice.service.CampaignService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping
    public ResponseEntity<CampaignResponseDTO> create(
            @RequestBody CampaignRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(campaignService.createCampaign(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CampaignResponseDTO> update(
            @PathVariable String id, @RequestBody CampaignRequestDTO dto) {
        return ResponseEntity.ok(campaignService.updateCampaign(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable String id) {
        campaignService.deleteCampaign(id);
        return ResponseEntity.ok("Campagne supprimée");
    }

    @GetMapping("/{id}")
    public ResponseEntity<CampaignResponseDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(campaignService.getCampaignById(id));
    }

    @GetMapping
    public ResponseEntity<List<CampaignResponseDTO>> getAll() {
        return ResponseEntity.ok(campaignService.getAllCampaigns());
    }

    @GetMapping("/sponsor/{sponsorId}")
    public ResponseEntity<List<CampaignResponseDTO>> getBySponsor(
            @PathVariable String sponsorId) {
        return ResponseEntity.ok(campaignService.getCampaignsBySponsor(sponsorId));
    }

    @GetMapping("/active")
    public ResponseEntity<List<CampaignResponseDTO>> getActive() {
        return ResponseEntity.ok(campaignService.getActiveCampaigns());
    }

    @GetMapping("/active/product/{productId}")
    public ResponseEntity<List<CampaignResponseDTO>> getActiveForProduct(
            @PathVariable String productId) {
        return ResponseEntity.ok(campaignService.getActiveForProduct(productId));
    }

    @GetMapping("/active/global")
    public ResponseEntity<List<CampaignResponseDTO>> getActiveGlobal() {
        return ResponseEntity.ok(campaignService.getActiveGlobal());
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<CampaignResponseDTO> approve(@PathVariable String id) {
        return ResponseEntity.ok(campaignService.approveCampaign(id));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<CampaignResponseDTO> reject(
            @PathVariable String id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            campaignService.rejectCampaign(id, body.get("adminNote")));
    }

    @PatchMapping("/{id}/pause")
    public ResponseEntity<CampaignResponseDTO> pause(@PathVariable String id) {
        return ResponseEntity.ok(campaignService.pauseCampaign(id));
    }

    @PatchMapping("/{id}/resume")
    public ResponseEntity<CampaignResponseDTO> resume(@PathVariable String id) {
        return ResponseEntity.ok(campaignService.resumeCampaign(id));
    }

    @PatchMapping("/{id}/view")
    public ResponseEntity<CampaignResponseDTO> trackView(@PathVariable String id) {
        return ResponseEntity.ok(campaignService.trackView(id));
    }

    @PatchMapping("/{id}/click")
    public ResponseEntity<CampaignResponseDTO> trackClick(@PathVariable String id) {
        return ResponseEntity.ok(campaignService.trackClick(id));
    }
}