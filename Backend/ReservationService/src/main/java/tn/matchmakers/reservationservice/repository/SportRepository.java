package tn.matchmakers.reservationservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tn.matchmakers.reservationservice.entities.Sport;

@Repository
public interface SportRepository extends MongoRepository<Sport, String> {
}
