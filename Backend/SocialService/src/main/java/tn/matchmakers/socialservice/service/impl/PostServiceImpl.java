package tn.matchmakers.socialservice.service.impl;

import tn.matchmakers.socialservice.dto.CommentaireResponseDto;
import tn.matchmakers.socialservice.dto.PostRequestDto;
import tn.matchmakers.socialservice.dto.PostResponseDto;
import tn.matchmakers.socialservice.dto.ReactionResponseDto;
import tn.matchmakers.socialservice.dto.SocialDtoMapper;
import tn.matchmakers.socialservice.entities.Commentaire;
import tn.matchmakers.socialservice.entities.Post;
import tn.matchmakers.socialservice.entities.Reaction;
import tn.matchmakers.socialservice.repository.CommentaireRepository;
import tn.matchmakers.socialservice.repository.PostRepository;
import tn.matchmakers.socialservice.repository.ReactionRepository;
import tn.matchmakers.socialservice.service.PostService;
import tn.matchmakers.socialservice.service.ToxicityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PostServiceImpl implements PostService {

    private final PostRepository postRepository;
    private final CommentaireRepository commentaireRepository;
    private final ReactionRepository reactionRepository;
    private final ToxicityService toxicityService;

    @Override
    public Page<PostResponseDto> getAllPosts(Pageable pageable, boolean expand) {
        log.info("Fetching all posts with pagination (excluding deleted), expand={}", expand);
        return postRepository.findByIsDeletedFalse(pageable).map(p -> toResponseDto(p, expand));
    }

    @Override
    public PostResponseDto getPostById(String id) {
        log.info("Fetching post with id: {}", id);
        return toResponseDto(findByIdOrThrow(id), true);
    }

    @Override
    public PostResponseDto createPost(PostRequestDto post) {
        log.info("Creating new post");
        
        // Toxicity Check
        toxicityService.checkToxicity(post.getContent());

        Post entity = Post.builder()
                .content(post.getContent())
                .idUser(post.getIdUser())
                .isDeleted(false)
                .build();
        entity.onCreate();
        return toResponseDto(postRepository.save(entity), true);
    }

    @Override
    public PostResponseDto updatePost(String id, PostRequestDto post) {
        log.info("Updating post with id: {}", id);
        
        // Toxicity Check
        toxicityService.checkToxicity(post.getContent());

        Post existingPost = findByIdOrThrow(id);
        existingPost.setContent(post.getContent());
        existingPost.setIdUser(post.getIdUser());
        return toResponseDto(postRepository.save(existingPost), true);
    }

    @Override
    public void deletePost(String id) {
        log.info("Soft deleting post with id: {} and its associated content", id);
        Post post = findByIdOrThrow(id);
        post.setIsDeleted(true);
        postRepository.save(post);

        // Cascading soft delete for comments
        List<Commentaire> comments = commentaireRepository.findByPost_IdPostAndIsDeletedFalse(id);
        if (comments != null && !comments.isEmpty()) {
            comments.forEach(c -> {
                c.setIsDeleted(true);
                commentaireRepository.save(c);
            });
            log.info("Cascaded soft delete to {} comments", comments.size());
        }

        // Hard delete reactions since they don't have isDeleted field
        List<Reaction> reactions = reactionRepository.findByPost_IdPost(id);
        if (reactions != null && !reactions.isEmpty()) {
            reactionRepository.deleteAll(reactions);
            log.info("Cascaded hard delete to {} reactions", reactions.size());
        }
    }

    private Post findByIdOrThrow(String id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found with id: " + id));
    }

    private PostResponseDto toResponseDto(Post post, boolean expand) {
        if (!expand) {
            return PostResponseDto.builder()
                    .idPost(post.getIdPost())
                    .content(post.getContent())
                    .postCreated_at(post.getPostCreated_at())
                    .idUser(post.getIdUser())
                    .isDeleted(post.getIsDeleted())
                    .commentaires(Collections.emptyList())
                    .reactions(Collections.emptyList())
                    .build();
        }

        List<Commentaire> commentaires = commentaireRepository.findByPost_IdPostAndIsDeletedFalse(post.getIdPost());
        commentaires.sort(Comparator.comparing(Commentaire::getPostCreated_at, Comparator.nullsLast(Comparator.naturalOrder())));

        List<CommentaireResponseDto> commentaireDtos = commentaires.stream()
                .map(c -> SocialDtoMapper.toCommentaireDto(c, post.getIdPost()))
                .toList();

        List<Reaction> reactions = reactionRepository.findByPost_IdPost(post.getIdPost());
        reactions.sort(Comparator.comparing(Reaction::getPostCreated_at, Comparator.nullsLast(Comparator.naturalOrder())));
        List<ReactionResponseDto> reactionDtos = reactions.stream().map(SocialDtoMapper::toReactionDto).toList();

        return PostResponseDto.builder()
                .idPost(post.getIdPost())
                .content(post.getContent())
                .postCreated_at(post.getPostCreated_at())
                .idUser(post.getIdUser())
                .isDeleted(post.getIsDeleted())
                .commentaires(commentaireDtos)
                .reactions(reactionDtos)
                .build();
    }
}
