package tn.matchmakers.socialservice.service.impl;

import tn.matchmakers.socialservice.dto.CommentaireRequestDto;
import tn.matchmakers.socialservice.dto.CommentaireResponseDto;
import tn.matchmakers.socialservice.dto.SocialDtoMapper;
import tn.matchmakers.socialservice.entities.Commentaire;
import tn.matchmakers.socialservice.repository.CommentaireRepository;
import tn.matchmakers.socialservice.service.CommentaireService;
import tn.matchmakers.socialservice.service.ToxicityService;
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
public class CommentaireServiceImpl implements CommentaireService {

    private final CommentaireRepository commentaireRepository;
    private final ToxicityService toxicityService;

    @Override
    public Page<CommentaireResponseDto> getAllCommentaires(Pageable pageable) {
        log.info("Fetching all commentaires with pagination (excluding deleted)");
        return commentaireRepository.findByIsDeletedFalse(pageable).map(this::toDto);
    }

    @Override
    public CommentaireResponseDto getCommentaireById(String id) {
        log.info("Fetching commentaire with id: {}", id);
        return toDto(getByIdOrThrow(id));
    }

    @Override
    public CommentaireResponseDto createCommentaire(CommentaireRequestDto dto) {
        log.info("Creating new commentaire");
        
        // Toxicity Check
        toxicityService.checkToxicity(dto.getContent());

        Commentaire commentaire = Commentaire.builder()
                .content(dto.getContent())
                .post(SocialEntityRefs.postRef(dto.getIdPost()))
                .idUser(dto.getIdUser())
                .isDeleted(false)
                .build();
        commentaire.onCreate();
        return toDto(commentaireRepository.save(commentaire));
    }

    @Override
    public CommentaireResponseDto updateCommentaire(String id, CommentaireRequestDto dto) {
        log.info("Updating commentaire with id: {}", id);
        
        // Toxicity Check
        toxicityService.checkToxicity(dto.getContent());

        Commentaire existing = getByIdOrThrow(id);
        existing.setContent(dto.getContent());
        existing.setPost(SocialEntityRefs.postRef(dto.getIdPost()));
        existing.setIdUser(dto.getIdUser());
        return toDto(commentaireRepository.save(existing));
    }

    @Override
    public void deleteCommentaire(String id) {
        log.info("Soft deleting commentaire with id: {}", id);
        Commentaire commentaire = getByIdOrThrow(id);
        commentaire.setIsDeleted(true);
        commentaireRepository.save(commentaire);
    }

    private Commentaire getByIdOrThrow(String id) {
        return commentaireRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Commentaire not found with id: " + id));
    }

    private CommentaireResponseDto toDto(Commentaire c) {
        String idPost = c.getPost() != null ? c.getPost().getIdPost() : null;
        return SocialDtoMapper.toCommentaireDto(c, idPost);
    }
}
