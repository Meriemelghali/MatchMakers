package tn.matchmakers.socialservice.controller;

import tn.matchmakers.socialservice.dto.PostRequestDto;
import tn.matchmakers.socialservice.dto.PostResponseDto;
import tn.matchmakers.socialservice.service.PostService;
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
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Tag(name = "Posts", description = "API de gestion des posts (avec soft delete)")
public class PostController {

    private final PostService postService;

    @Operation(summary = "Récupérer tous les posts", description = "Récupère la liste paginée des posts non supprimés")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des posts récupérée avec succès")
    })
    @GetMapping
    public ResponseEntity<Page<PostResponseDto>> getAllPosts(
            @Parameter(description = "Numéro de page") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Taille de la page") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Inclure commentaires et réactions (plus lourd)") @RequestParam(defaultValue = "false") boolean expand) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(postService.getAllPosts(pageable, expand));
    }

    @Operation(summary = "Récupérer un post par ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Post trouvé"),
            @ApiResponse(responseCode = "404", description = "Post non trouvé")
    })
    @GetMapping("/{id}")
    public ResponseEntity<PostResponseDto> getPostById(
            @Parameter(description = "ID du post") @PathVariable String id) {
        return ResponseEntity.ok(postService.getPostById(id));
    }

    @Operation(summary = "Créer un nouveau post")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Post créé avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PostMapping
    public ResponseEntity<PostResponseDto> createPost(@Valid @RequestBody PostRequestDto post) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(postService.createPost(post));
    }

    @Operation(summary = "Mettre à jour un post")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Post mis à jour avec succès"),
            @ApiResponse(responseCode = "404", description = "Post non trouvé"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PutMapping("/{id}")
    public ResponseEntity<PostResponseDto> updatePost(
            @Parameter(description = "ID du post") @PathVariable String id,
            @Valid @RequestBody PostRequestDto post) {
        return ResponseEntity.ok(postService.updatePost(id, post));
    }

    @Operation(summary = "Supprimer un post (soft delete)", description = "Marque le post comme supprimé sans le supprimer physiquement")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Post supprimé avec succès"),
            @ApiResponse(responseCode = "404", description = "Post non trouvé")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @Parameter(description = "ID du post") @PathVariable String id) {
        postService.deletePost(id);
        return ResponseEntity.noContent().build();
    }
}

