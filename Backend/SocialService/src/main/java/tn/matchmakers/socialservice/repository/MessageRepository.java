package tn.matchmakers.socialservice.repository;

import tn.matchmakers.socialservice.entities.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findByConversation_IdConversation(String idConversation);
}
