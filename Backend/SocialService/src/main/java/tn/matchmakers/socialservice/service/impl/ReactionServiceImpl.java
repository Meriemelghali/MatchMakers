package tn.matchmakers.socialservice.service.impl;

import tn.matchmakers.socialservice.dto.ReactionRequestDto;
import tn.matchmakers.socialservice.dto.ReactionResponseDto;
import tn.matchmakers.socialservice.dto.SocialDtoMapper;
import tn.matchmakers.socialservice.entities.Reaction;
import tn.matchmakers.socialservice.repository.ReactionRepository;
import tn.matchmakers.socialservice.service.ReactionService;
import tn.matchmakers.socialservice.support.SocialEntityRefs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReactionServiceImpl implements ReactionService {

    private final ReactionRepository reactionRepository;

    @Override
    public Page<ReactionResponseDto> getAllReactions(Pageable pageable) {
        log.info("Fetching all reactions with pagination");
        return reactionRepository.findAll(pageable).map(SocialDtoMapper::toReactionDto);
    }

    @Override
    public ReactionResponseDto getReactionById(String id) {
        log.info("Fetching reaction with id: {}", id);
        return SocialDtoMapper.toReactionDto(getByIdOrThrow(id));
    }

    @Override
    public ReactionResponseDto createReaction(ReactionRequestDto dto) {
        log.info("Creating new reaction");
        Reaction reaction = Reaction.builder()
                .content(dto.getContent())
                .post(SocialEntityRefs.postRef(dto.getIdPost()))
                .idUser(dto.getIdUser())
                .build();
        reaction.onCreate();
        return SocialDtoMapper.toReactionDto(reactionRepository.save(reaction));
    }

    @Override
    public ReactionResponseDto updateReaction(String id, ReactionRequestDto dto) {
        log.info("Updating reaction with id: {}", id);
        Reaction existing = getByIdOrThrow(id);
        existing.setContent(dto.getContent());
        existing.setPost(SocialEntityRefs.postRef(dto.getIdPost()));
        existing.setIdUser(dto.getIdUser());
        return SocialDtoMapper.toReactionDto(reactionRepository.save(existing));
    }

    @Override
    public void deleteReaction(String id) {
        log.info("Deleting reaction with id: {}", id);
        Reaction reaction = getByIdOrThrow(id);
        reactionRepository.delete(reaction);
    }

    private Reaction getByIdOrThrow(String id) {
        return reactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reaction not found with id: " + id));
    }
}
