package tn.matchmakers.socialservice.service.impl;

import tn.matchmakers.socialservice.dto.MessageRequestDto;
import tn.matchmakers.socialservice.dto.MessageResponseDto;
import tn.matchmakers.socialservice.dto.SocialDtoMapper;
import tn.matchmakers.socialservice.entities.Message;
import tn.matchmakers.socialservice.repository.MessageRepository;
import tn.matchmakers.socialservice.service.MessageService;
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
public class MessageServiceImpl implements MessageService {

    private final MessageRepository messageRepository;

    @Override
    public Page<MessageResponseDto> getAllMessages(Pageable pageable) {
        log.info("Fetching all messages with pagination");
        return messageRepository.findAll(pageable).map(SocialDtoMapper::toMessageDto);
    }

    @Override
    public MessageResponseDto getMessageById(String id) {
        log.info("Fetching message with id: {}", id);
        return SocialDtoMapper.toMessageDto(getByIdOrThrow(id));
    }

    @Override
    public MessageResponseDto createMessage(MessageRequestDto dto) {
        log.info("Creating new message");
        Message message = Message.builder()
                .content(dto.getContent())
                .conversation(SocialEntityRefs.conversationRef(dto.getIdConversation()))
                .idUser(dto.getIdUser())
                .build();
        message.onCreate();
        return SocialDtoMapper.toMessageDto(messageRepository.save(message));
    }

    @Override
    public MessageResponseDto updateMessage(String id, MessageRequestDto dto) {
        log.info("Updating message with id: {}", id);
        Message existing = getByIdOrThrow(id);
        existing.setContent(dto.getContent());
        existing.setConversation(SocialEntityRefs.conversationRef(dto.getIdConversation()));
        existing.setIdUser(dto.getIdUser());
        return SocialDtoMapper.toMessageDto(messageRepository.save(existing));
    }

    @Override
    public void deleteMessage(String id) {
        log.info("Deleting message with id: {}", id);
        Message message = getByIdOrThrow(id);
        messageRepository.delete(message);
    }

    private Message getByIdOrThrow(String id) {
        return messageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Message not found with id: " + id));
    }
}
