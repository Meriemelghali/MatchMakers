package tn.matchmakers.socialservice.controller;

import tn.matchmakers.socialservice.dto.MessageRequestDto;
import tn.matchmakers.socialservice.dto.MessageResponseDto;
import tn.matchmakers.socialservice.service.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@Tag(name = "Messages", description = "API de gestion des messages dans les conversations")
public class MessageController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @Operation(summary = "Récupérer tous les messages")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des messages récupérée avec succès")
    })
    @GetMapping
    public ResponseEntity<Page<MessageResponseDto>> getAllMessages(
            @Parameter(description = "Numéro de page") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Taille de la page") @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(messageService.getAllMessages(pageable));
    }

    @Operation(summary = "Récupérer un message par ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Message trouvé"),
            @ApiResponse(responseCode = "404", description = "Message non trouvé")
    })
    @GetMapping("/{id}")
    public ResponseEntity<MessageResponseDto> getMessageById(
            @Parameter(description = "ID du message") @PathVariable String id) {
        return ResponseEntity.ok(messageService.getMessageById(id));
    }

    @Operation(summary = "Créer un nouveau message")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Message créé avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PostMapping
    public ResponseEntity<MessageResponseDto> createMessage(@Valid @RequestBody MessageRequestDto message) {
        MessageResponseDto response = messageService.createMessage(message);
        // Broadcast the message to the conversation topic
        messagingTemplate.convertAndSend("/topic/messages/" + response.getIdConversation(), response);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "Mettre à jour un message")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Message mis à jour avec succès"),
            @ApiResponse(responseCode = "404", description = "Message non trouvé"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PutMapping("/{id}")
    public ResponseEntity<MessageResponseDto> updateMessage(
            @Parameter(description = "ID du message") @PathVariable String id,
            @Valid @RequestBody MessageRequestDto message) {
        return ResponseEntity.ok(messageService.updateMessage(id, message));
    }

    @Operation(summary = "Supprimer un message")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Message supprimé avec succès"),
            @ApiResponse(responseCode = "404", description = "Message non trouvé")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(
            @Parameter(description = "ID du message") @PathVariable String id) {
        MessageResponseDto message = messageService.getMessageById(id);
        messageService.deleteMessage(id);
        
        // Broadcast deletion event as an object
        messagingTemplate.convertAndSend("/topic/messages/" + message.getIdConversation() + "/delete", Map.of("idMessage", id));
        System.out.println("DEBUG: Broadcasted message deletion " + id + " to conversation " + message.getIdConversation());
        
        return ResponseEntity.noContent().build();
    }
}
