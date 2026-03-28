package tn.matchmakers.socialservice.service;

import tn.matchmakers.socialservice.dto.CommentaireRequestDto;
import tn.matchmakers.socialservice.dto.CommentaireResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommentaireService {
    Page<CommentaireResponseDto> getAllCommentaires(Pageable pageable);

    CommentaireResponseDto getCommentaireById(String id);

    CommentaireResponseDto createCommentaire(CommentaireRequestDto dto);

    CommentaireResponseDto updateCommentaire(String id, CommentaireRequestDto dto);

    void deleteCommentaire(String id);
}
