package tn.matchmakers.socialservice.service;

import tn.matchmakers.socialservice.dto.PostRequestDto;
import tn.matchmakers.socialservice.dto.PostResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PostService {
    /**
     * @param expand si {@code true}, charge commentaires + réactions (coûteux sur une liste paginée).
     */
    Page<PostResponseDto> getAllPosts(Pageable pageable, boolean expand);
    PostResponseDto getPostById(String id);
    PostResponseDto createPost(PostRequestDto post);
    PostResponseDto updatePost(String id, PostRequestDto post);
    void deletePost(String id);
}
