package tn.matchmakers.socialservice.service;

import tn.matchmakers.socialservice.dto.ReactionRequestDto;
import tn.matchmakers.socialservice.dto.ReactionResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ReactionService {
    Page<ReactionResponseDto> getAllReactions(Pageable pageable);

    ReactionResponseDto getReactionById(String id);

    ReactionResponseDto createReaction(ReactionRequestDto dto);

    ReactionResponseDto updateReaction(String id, ReactionRequestDto dto);

    void deleteReaction(String id);
}
