package tn.matchmakers.socialservice.controller;

import tn.matchmakers.socialservice.dto.ReactionRequestDto;
import tn.matchmakers.socialservice.dto.ReactionResponseDto;
import tn.matchmakers.socialservice.service.ReactionService;
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
@RequestMapping("/api/reactions")
@RequiredArgsConstructor
@Tag(name = "Reactions", description = "API de gestion des réactions sur les posts (like, support, angry, …)")
public class ReactionController {

    private final ReactionService reactionService;

    @Operation(summary = "Récupérer toutes les réactions")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des réactions récupérée avec succès")
    })
    @GetMapping
    public ResponseEntity<Page<ReactionResponseDto>> getAllReactions(
            @Parameter(description = "Numéro de page") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Taille de la page") @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(reactionService.getAllReactions(pageable));
    }

    @Operation(summary = "Récupérer une réaction par ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Réaction trouvée"),
            @ApiResponse(responseCode = "404", description = "Réaction non trouvée")
    })
    @GetMapping("/{id}")
    public ResponseEntity<ReactionResponseDto> getReactionById(
            @Parameter(description = "ID de la réaction") @PathVariable String id) {
        return ResponseEntity.ok(reactionService.getReactionById(id));
    }

    @Operation(summary = "Créer une nouvelle réaction")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Réaction créée avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PostMapping
    public ResponseEntity<ReactionResponseDto> createReaction(@Valid @RequestBody ReactionRequestDto reaction) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reactionService.createReaction(reaction));
    }

    @Operation(summary = "Mettre à jour une réaction")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Réaction mise à jour avec succès"),
            @ApiResponse(responseCode = "404", description = "Réaction non trouvée"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PutMapping("/{id}")
    public ResponseEntity<ReactionResponseDto> updateReaction(
            @Parameter(description = "ID de la réaction") @PathVariable String id,
            @Valid @RequestBody ReactionRequestDto reaction) {
        return ResponseEntity.ok(reactionService.updateReaction(id, reaction));
    }

    @Operation(summary = "Supprimer une réaction")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Réaction supprimée avec succès"),
            @ApiResponse(responseCode = "404", description = "Réaction non trouvée")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReaction(
            @Parameter(description = "ID de la réaction") @PathVariable String id) {
        reactionService.deleteReaction(id);
        return ResponseEntity.noContent().build();
    }
}
