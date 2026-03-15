package tn.matchmakers.userservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.userservice.entities.Session;

public interface SessionRepository extends MongoRepository<Session, String> {
}
