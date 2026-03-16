package tn.matchmakers.sportservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.sportservice.entities.Sport;

import java.util.List;

public interface SportRepository extends MongoRepository<Sport, String> {
    List<Sport> findBySportCategoriesId(String categoryId);
}
