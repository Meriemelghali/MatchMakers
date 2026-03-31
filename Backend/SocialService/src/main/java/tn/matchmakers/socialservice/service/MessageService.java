package tn.matchmakers.socialservice.service;

import tn.matchmakers.socialservice.dto.MessageRequestDto;
import tn.matchmakers.socialservice.dto.MessageResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MessageService {
    Page<MessageResponseDto> getAllMessages(Pageable pageable);

    MessageResponseDto getMessageById(String id);

    MessageResponseDto createMessage(MessageRequestDto dto);

    MessageResponseDto updateMessage(String id, MessageRequestDto dto);

    void deleteMessage(String id);
}
