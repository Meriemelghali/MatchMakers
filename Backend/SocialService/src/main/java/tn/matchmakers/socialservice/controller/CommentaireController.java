package tn.matchmakers.socialservice.controller;

import tn.matchmakers.socialservice.dto.CommentaireRequestDto;
import tn.matchmakers.socialservice.dto.CommentaireResponseDto;
import tn.matchmakers.socialservice.service.CommentaireService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/commentaires")
@RequiredArgsConstructor
@Tag(name = "Commentaires", description = "API de gestion des commentaires (avec soft delete)")
public class CommentaireController {

    private final CommentaireService commentaireService;

    @Operation(summary = "Récupérer tous les commentaires", description = "Récupère la liste paginée des commentaires non supprimés")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des commentaires récupérée avec succès")
    })
    @GetMapping
    public ResponseEntity<Page<CommentaireResponseDto>> getAllCommentaires(
            @Parameter(description = "Numéro de page") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Taille de la page") @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(commentaireService.getAllCommentaires(pageable));
    }

    @Operation(summary = "Récupérer un commentaire par ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Commentaire trouvé"),
            @ApiResponse(responseCode = "404", description = "Commentaire non trouvé")
    })
    @GetMapping("/{id}")
    public ResponseEntity<CommentaireResponseDto> getCommentaireById(
            @Parameter(description = "ID du commentaire") @PathVariable String id) {
        return ResponseEntity.ok(commentaireService.getCommentaireById(id));
    }

    @Operation(summary = "Créer un nouveau commentaire")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Commentaire créé avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PostMapping
    public ResponseEntity<CommentaireResponseDto> createCommentaire(@Valid @RequestBody CommentaireRequestDto commentaire) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentaireService.createCommentaire(commentaire));
    }

    @Operation(summary = "Mettre à jour un commentaire")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Commentaire mis à jour avec succès"),
            @ApiResponse(responseCode = "404", description = "Commentaire non trouvé"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PutMapping("/{id}")
    public ResponseEntity<CommentaireResponseDto> updateCommentaire(
            @Parameter(description = "ID du commentaire") @PathVariable String id,
            @Valid @RequestBody CommentaireRequestDto commentaire) {
        return ResponseEntity.ok(commentaireService.updateCommentaire(id, commentaire));
    }

    @Operation(summary = "Supprimer un commentaire (soft delete)", description = "Marque le commentaire comme supprimé")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Commentaire supprimé avec succès"),
            @ApiResponse(responseCode = "404", description = "Commentaire non trouvé")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCommentaire(
            @Parameter(description = "ID du commentaire") @PathVariable String id) {
        commentaireService.deleteCommentaire(id);
        return ResponseEntity.noContent().build();
    }
}
