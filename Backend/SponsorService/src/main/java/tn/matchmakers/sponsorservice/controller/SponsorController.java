package tn.matchmakers.sponsorservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.sponsorservice.dto.SponsorRequestDTO;
import tn.matchmakers.sponsorservice.dto.SponsorResponseDTO;
import tn.matchmakers.sponsorservice.entity.SponsorStatus;
import tn.matchmakers.sponsorservice.service.SponsorService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sponsors")
@RequiredArgsConstructor
@CrossOrigin(
        origins = "http://localhost:4200",
        allowedHeaders = "*",
        methods = {
                RequestMethod.GET,
                RequestMethod.POST,
                RequestMethod.PUT,
                RequestMethod.DELETE,
                RequestMethod.PATCH,
                RequestMethod.OPTIONS
        }
)
public class SponsorController {

    private final SponsorService sponsorService;

    // ✅ Créer profil sponsor
    @PostMapping
    public ResponseEntity<SponsorResponseDTO> create(
            @RequestBody SponsorRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(sponsorService.createSponsor(dto));
    }

    // ✅ Modifier profil
    @PutMapping("/{id}")
    public ResponseEntity<SponsorResponseDTO> update(
            @PathVariable String id,
            @RequestBody SponsorRequestDTO dto) {
        return ResponseEntity.ok(sponsorService.updateSponsor(id, dto));
    }

    // ✅ Supprimer
    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable String id) {
        sponsorService.deleteSponsor(id);
        return ResponseEntity.ok("Sponsor supprimé");
    }

    // ✅ Get par ID
    @GetMapping("/{id}")
    public ResponseEntity<SponsorResponseDTO> getById(
            @PathVariable String id) {
        return ResponseEntity.ok(sponsorService.getSponsorById(id));
    }

    // ✅ Get par userId
    @GetMapping("/user/{userId}")
    public ResponseEntity<SponsorResponseDTO> getByUserId(
            @PathVariable String userId) {
        return ResponseEntity.ok(sponsorService.getSponsorByUserId(userId));
    }

    // ✅ Lister tous
    @GetMapping
    public ResponseEntity<List<SponsorResponseDTO>> getAll() {
        return ResponseEntity.ok(sponsorService.getAllSponsors());
    }

    // ✅ Lister par statut
    @GetMapping("/status/{status}")
    public ResponseEntity<List<SponsorResponseDTO>> getByStatus(
            @PathVariable SponsorStatus status) {
        return ResponseEntity.ok(sponsorService.getSponsorsByStatus(status));
    }

    // ✅ Admin — approuver
    @PatchMapping("/{id}/approve")
    public ResponseEntity<SponsorResponseDTO> approve(
            @PathVariable String id) {
        return ResponseEntity.ok(sponsorService.approveSponsor(id));
    }

    // ✅ Admin — rejeter
    @PatchMapping("/{id}/reject")
    public ResponseEntity<SponsorResponseDTO> reject(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            sponsorService.rejectSponsor(id, body.get("adminNote"))
        );
    }

    // ✅ Admin — désactiver
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<SponsorResponseDTO> deactivate(
            @PathVariable String id) {
        return ResponseEntity.ok(sponsorService.deactivateSponsor(id));
    }

    // ✅ Upload logo
    @PatchMapping("/{id}/logo")
    public ResponseEntity<SponsorResponseDTO> uploadLogo(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            sponsorService.uploadLogo(id, body.get("logoUrl"))
        );
    }
}