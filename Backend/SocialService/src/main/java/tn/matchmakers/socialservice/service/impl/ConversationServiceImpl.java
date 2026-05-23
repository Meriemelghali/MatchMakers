package tn.matchmakers.socialservice.service.impl;

import tn.matchmakers.socialservice.dto.ConversationRequestDto;
import tn.matchmakers.socialservice.dto.ConversationResponseDto;
import tn.matchmakers.socialservice.dto.MessageResponseDto;
import tn.matchmakers.socialservice.dto.SocialDtoMapper;
import tn.matchmakers.socialservice.entities.Conversation;
import tn.matchmakers.socialservice.entities.Message;
import tn.matchmakers.socialservice.repository.ConversationRepository;
import tn.matchmakers.socialservice.repository.MessageRepository;
import tn.matchmakers.socialservice.service.ConversationService;
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
public class ConversationServiceImpl implements ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    @Override
    public Page<ConversationResponseDto> getAllConversations(Pageable pageable) {
        log.info("Fetching all conversations with pagination");
        return conversationRepository.findAll(pageable).map(c -> toResponseDto(c, Collections.emptyList()));
    }

    @Override
    public ConversationResponseDto getConversationById(String id) {
        log.info("Fetching conversation with id: {}", id);
        Conversation c = getByIdOrThrow(id);
        List<MessageResponseDto> messages = loadMessagesOrdered(c.getIdConversation());
        return toResponseDto(c, messages);
    }

    @Override
    public ConversationResponseDto createConversation(ConversationRequestDto dto) {
        log.info("Creating new conversation");
        Conversation c = Conversation.builder()
                .conversationT(dto.getConversationT())
                .userIds(dto.getUserIds())
                .build();
        Conversation saved = conversationRepository.save(c);
        return toResponseDto(saved, Collections.emptyList());
    }

    @Override
    public ConversationResponseDto updateConversation(String id, ConversationRequestDto dto) {
        log.info("Updating conversation with id: {}", id);
        Conversation existing = getByIdOrThrow(id);
        existing.setConversationT(dto.getConversationT());
        existing.setUserIds(dto.getUserIds());
        Conversation saved = conversationRepository.save(existing);
        return toResponseDto(saved, loadMessagesOrdered(saved.getIdConversation()));
    }

    @Override
    public void deleteConversation(String id) {
        log.info("Deleting conversation with id: {} and its messages", id);
        Conversation conversation = getByIdOrThrow(id);
        
        // Cascading delete for messages
        List<Message> messages = messageRepository.findByConversation_IdConversation(id);
        if (messages != null && !messages.isEmpty()) {
            messageRepository.deleteAll(messages);
            log.info("Cascaded delete to {} messages", messages.size());
        }
        
        conversationRepository.delete(conversation);
    }

    private Conversation getByIdOrThrow(String id) {
        return conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found with id: " + id));
    }

    private List<MessageResponseDto> loadMessagesOrdered(String idConversation) {
        List<Message> msgs = messageRepository.findByConversation_IdConversation(idConversation);
        msgs.sort(Comparator.comparing(Message::getSend_at, Comparator.nullsLast(Comparator.naturalOrder())));
        return msgs.stream().map(SocialDtoMapper::toMessageDto).toList();
    }

    private ConversationResponseDto toResponseDto(Conversation c, List<MessageResponseDto> messages) {
        return ConversationResponseDto.builder()
                .idConversation(c.getIdConversation())
                .conversationT(c.getConversationT())
                .userIds(c.getUserIds())
                .messages(messages != null ? messages : Collections.emptyList())
                .build();
    }
}
