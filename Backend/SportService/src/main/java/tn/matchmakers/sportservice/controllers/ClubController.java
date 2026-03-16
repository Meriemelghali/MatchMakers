package tn.matchmakers.sportservice.controllers;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.matchmakers.sportservice.dto.ClubCreateDto;
import tn.matchmakers.sportservice.dto.ClubResponseDto;
import tn.matchmakers.sportservice.entities.Club;
import tn.matchmakers.sportservice.services.ClubService;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/clubs")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200"})
public class ClubController {
    private final ClubService clubService;

    // ─── CRUD
    @GetMapping
    public ResponseEntity<List<Club>> getAll() {
        return ResponseEntity.ok(clubService.getAll());
    }
    @GetMapping("/{id}")
    public ResponseEntity<Club> getById(@PathVariable String id) {
        return ResponseEntity.ok(clubService.getById(id));
    }
    @GetMapping("/{id}/detail")
    public ResponseEntity<ClubResponseDto> getDetail(
            @PathVariable String id,
            HttpServletRequest request) {
        String baseUrl = request.getScheme() + "://" + request.getServerName()
                + ":" + request.getServerPort();
        return ResponseEntity.ok(clubService.getClubDetail(id, baseUrl));
    }
    @GetMapping("/sport/{sportId}")
    public ResponseEntity<List<Club>> getBySport(@PathVariable String sportId) {
        return ResponseEntity.ok(clubService.getBySport(sportId));
    }
    @GetMapping("/city/{city}")
    public ResponseEntity<List<Club>> getByCity(@PathVariable String city) {
        return ResponseEntity.ok(clubService.getByCity(city));
    }
    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<List<Club>> getByOwner(@PathVariable String ownerId) {
        return ResponseEntity.ok(clubService.getByOwner(ownerId));
    }
    @PostMapping
    public ResponseEntity<ClubResponseDto> create(
            @RequestBody ClubCreateDto dto,
            @RequestHeader("Authorization") String tokenHeader) {

        // le token dans le header contient "Bearer ..."
        String token = tokenHeader.replace("Bearer ", "");
        ClubResponseDto created = clubService.createClub(dto, token);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    @PutMapping("/{id}")
    public ResponseEntity<Club> update(@PathVariable String id, @RequestBody Club club) {
        return ResponseEntity.ok(clubService.update(id, club));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        clubService.delete(id);
        return ResponseEntity.noContent().build();
    }
    // ─── Logo
    @PostMapping(value = "/{id}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Club> uploadLogo(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(clubService.uploadLogo(id, file));
    }

    /**
     * Affiche le logo d'un club.
     * GET /api/clubs/logo/{fileName}
     * Angular : <img [src]="'http://localhost:8084/api/clubs/logo/' + club.logoFileName">
     */
    @GetMapping("/logo/{fileName}")
    public ResponseEntity<Resource> getLogo(@PathVariable String fileName) throws IOException {
        Path filePath = clubService.getLogoPath(fileName);
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        // Détecte automatiquement le type (png, jpg, etc.)
        String contentType = java.nio.file.Files.probeContentType(filePath);
        if (contentType == null) contentType = "application/octet-stream";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                .body(resource);
    }

    // ─── Teams
    @PostMapping("/{id}/teams/{teamId}")
    public ResponseEntity<Club> addTeam(
            @PathVariable String id,
            @PathVariable String teamId) {
        return ResponseEntity.ok(clubService.addTeam(id, teamId));
    }

    @DeleteMapping("/{id}/teams/{teamId}")
    public ResponseEntity<Club> removeTeam(
            @PathVariable String id,
            @PathVariable String teamId) {
        return ResponseEntity.ok(clubService.removeTeam(id, teamId));
    }
}