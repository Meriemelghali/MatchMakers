package tn.matchmakers.terrainservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.matchmakers.terrainservice.dto.CreateTerrainRequest;
import tn.matchmakers.terrainservice.dto.TerrainDTO;
import tn.matchmakers.terrainservice.dto.TimeSlotDTO;
import tn.matchmakers.terrainservice.enums.SportType;
import tn.matchmakers.terrainservice.enums.TerrainStatus;
import tn.matchmakers.terrainservice.service.TerrainService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/")
@RequiredArgsConstructor
public class TerrainController {

    private static final String UPLOAD_DIR = "./uploads/terrains/";
    private static final long MAX_SIZE = 10L * 1024 * 1024; // 10 MB
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final TerrainService terrainService;

    @PostMapping
    public ResponseEntity<TerrainDTO> creerTerrain(@Valid @RequestBody CreateTerrainRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(terrainService.creerTerrain(request));
    }

    @GetMapping
    public ResponseEntity<List<TerrainDTO>> obtenirTousLesTerrains() {
        return ResponseEntity.ok(terrainService.obtenirTousLesTerrains());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TerrainDTO> obtenirTerrain(@PathVariable String id) {
        return ResponseEntity.ok(terrainService.obtenirTerrain(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TerrainDTO> mettreAJourTerrain(@PathVariable String id,
            @Valid @RequestBody CreateTerrainRequest request) {
        return ResponseEntity.ok(terrainService.mettreAJourTerrain(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimerTerrain(@PathVariable String id) {
        terrainService.supprimerTerrain(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/statut")
    public ResponseEntity<TerrainDTO> changerStatut(@PathVariable String id,
            @RequestParam TerrainStatus statut) {
        return ResponseEntity.ok(terrainService.changerStatut(id, statut));
    }

    @PostMapping(value = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TerrainDTO> uploadPhoto(@PathVariable String id,
            @RequestParam("file") MultipartFile file) throws IOException {
        if (file.getSize() > MAX_SIZE) {
            throw new IllegalArgumentException("La taille du fichier ne doit pas dépasser 10 Mo");
        }
        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("Seuls les formats JPEG, PNG et WEBP sont acceptés");
        }
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path dir = Paths.get(UPLOAD_DIR + id);
        Files.createDirectories(dir);
        Files.write(dir.resolve(filename), file.getBytes());
        return ResponseEntity.ok(terrainService.ajouterPhoto(id, filename));
    }

    @DeleteMapping("/{id}/photos/{filename}")
    public ResponseEntity<TerrainDTO> supprimerPhoto(@PathVariable String id, @PathVariable String filename) {
        return ResponseEntity.ok(terrainService.supprimerPhoto(id, filename));
    }

    @GetMapping("/sport/{typeSport}")
    public ResponseEntity<List<TerrainDTO>> filtrerParTypeSport(@PathVariable SportType typeSport) {
        return ResponseEntity.ok(terrainService.filtrerParTypeSport(typeSport));
    }

    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<TerrainDTO>> filtrerParStatut(@PathVariable TerrainStatus statut) {
        return ResponseEntity.ok(terrainService.filtrerParStatut(statut));
    }

    @GetMapping("/ville/{ville}")
    public ResponseEntity<List<TerrainDTO>> filtrerParVille(@PathVariable String ville) {
        return ResponseEntity.ok(terrainService.filtrerParVille(ville));
    }

    @GetMapping("/disponibles")
    public ResponseEntity<List<TerrainDTO>> trouverDisponibles(
            @RequestParam SportType typeSport,
            @RequestParam LocalDateTime debut,
            @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(terrainService.trouverDisponiblesParTypeEtCreneau(typeSport, debut, fin));
    }

    @PutMapping("/{id}/creneaux")
    public ResponseEntity<TerrainDTO> gererCreneaux(@PathVariable String id,
            @RequestBody List<TimeSlotDTO> creneaux) {
        return ResponseEntity.ok(terrainService.gererCreneaux(id, creneaux));
    }
}
