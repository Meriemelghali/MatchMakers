package tn.matchmakers.socialservice.dto;

import tn.matchmakers.socialservice.entities.Commentaire;
import tn.matchmakers.socialservice.entities.Message;
import tn.matchmakers.socialservice.entities.Reaction;

public final class SocialDtoMapper {

    private SocialDtoMapper() {
    }

    public static ReactionResponseDto toReactionDto(Reaction r) {
        if (r == null) {
            return null;
        }
        return ReactionResponseDto.builder()
                .idReaction(r.getIdReaction())
                .content(r.getContent())
                .postCreated_at(r.getPostCreated_at())
                .idUser(r.getIdUser())
                .idPost(r.getPost() != null ? r.getPost().getIdPost() : null)
                .build();
    }

    public static CommentaireResponseDto toCommentaireDto(Commentaire c, String idPostFallback) {
        if (c == null) {
            return null;
        }
        String idPost = c.getPost() != null ? c.getPost().getIdPost() : idPostFallback;
        return CommentaireResponseDto.builder()
                .idComment(c.getIdComment())
                .content(c.getContent())
                .postCreated_at(c.getPostCreated_at())
                .idUser(c.getIdUser())
                .isDeleted(c.getIsDeleted())
                .idPost(idPost)
                .build();
    }

    public static MessageResponseDto toMessageDto(Message m) {
        if (m == null) {
            return null;
        }
        return MessageResponseDto.builder()
                .idMessage(m.getIdMessage())
                .content(m.getContent())
                .send_at(m.getSend_at())
                .idUser(m.getIdUser())
                .idConversation(m.getConversation() != null ? m.getConversation().getIdConversation() : null)
                .build();
    }
}
