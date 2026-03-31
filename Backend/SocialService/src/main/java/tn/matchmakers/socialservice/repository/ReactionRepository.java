package tn.matchmakers.socialservice.repository;

import tn.matchmakers.socialservice.entities.Reaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReactionRepository extends MongoRepository<Reaction, String> {
    /** Toutes les réactions du post (like, support, angry, …). */
    List<Reaction> findByPost_IdPost(String idPost);
}
