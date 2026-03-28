package tn.matchmakers.socialservice.repository;

import tn.matchmakers.socialservice.entities.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationRepository extends MongoRepository<Conversation, String> {
}
