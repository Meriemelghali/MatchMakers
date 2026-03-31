package tn.matchmakers.socialservice.service;

import tn.matchmakers.socialservice.dto.ConversationRequestDto;
import tn.matchmakers.socialservice.dto.ConversationResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ConversationService {
    Page<ConversationResponseDto> getAllConversations(Pageable pageable);

    ConversationResponseDto getConversationById(String id);

    ConversationResponseDto createConversation(ConversationRequestDto dto);

    ConversationResponseDto updateConversation(String id, ConversationRequestDto dto);

    void deleteConversation(String id);
}
