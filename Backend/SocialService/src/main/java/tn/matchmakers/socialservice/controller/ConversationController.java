package tn.matchmakers.socialservice.controller;

import tn.matchmakers.socialservice.dto.ConversationRequestDto;
import tn.matchmakers.socialservice.dto.ConversationResponseDto;
import tn.matchmakers.socialservice.service.ConversationService;
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
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
@Tag(name = "Conversations", description = "API de gestion des conversations (PRIVATE, TEAM, EVENT, COMPETITION)")
public class ConversationController {

    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Operation(summary = "Récupérer toutes les conversations")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des conversations récupérée avec succès")
    })
    @GetMapping
    public ResponseEntity<Page<ConversationResponseDto>> getAllConversations(
            @Parameter(description = "Numéro de page") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Taille de la page") @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(conversationService.getAllConversations(pageable));
    }

    @Operation(summary = "Récupérer une conversation par ID", description = "Inclut la liste des messages ordonnés par date d'envoi")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Conversation trouvée"),
            @ApiResponse(responseCode = "404", description = "Conversation non trouvée")
    })
    @GetMapping("/{id}")
    public ResponseEntity<ConversationResponseDto> getConversationById(
            @Parameter(description = "ID de la conversation") @PathVariable String id) {
        return ResponseEntity.ok(conversationService.getConversationById(id));
    }

    @Operation(summary = "Créer une nouvelle conversation")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Conversation créée avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PostMapping
    public ResponseEntity<ConversationResponseDto> createConversation(@Valid @RequestBody ConversationRequestDto conversation) {
        ConversationResponseDto response = conversationService.createConversation(conversation);
        
        // Broadcast new conversation to all participants
        if (response.getUserIds() != null) {
            response.getUserIds().forEach(userId -> {
                messagingTemplate.convertAndSend("/topic/user/" + userId + "/conversations", response);
            });
        }
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "Mettre à jour une conversation")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Conversation mise à jour avec succès"),
            @ApiResponse(responseCode = "404", description = "Conversation non trouvée"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PutMapping("/{id}")
    public ResponseEntity<ConversationResponseDto> updateConversation(
            @Parameter(description = "ID de la conversation") @PathVariable String id,
            @Valid @RequestBody ConversationRequestDto conversation) {
        return ResponseEntity.ok(conversationService.updateConversation(id, conversation));
    }

    @Operation(summary = "Supprimer une conversation")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Conversation supprimée avec succès"),
            @ApiResponse(responseCode = "404", description = "Conversation non trouvée")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(
            @Parameter(description = "ID de la conversation") @PathVariable String id) {
        ConversationResponseDto conversation = conversationService.getConversationById(id);
        conversationService.deleteConversation(id);
        
        // Broadcast deletion to all participants as an object
        if (conversation.getUserIds() != null) {
            conversation.getUserIds().forEach(userId -> {
                messagingTemplate.convertAndSend("/topic/user/" + userId + "/conversations/delete", Map.of("idConversation", id));
                System.out.println("DEBUG: Broadcasted conversation deletion " + id + " to user " + userId);
            });
        }
        
        return ResponseEntity.noContent().build();
    }
}
