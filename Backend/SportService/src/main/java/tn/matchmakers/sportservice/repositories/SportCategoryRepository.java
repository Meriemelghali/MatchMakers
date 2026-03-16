package tn.matchmakers.sportservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.sportservice.entities.SportCategory;

import java.util.Optional;

public interface SportCategoryRepository extends MongoRepository<SportCategory, String> {
    Optional<SportCategory> findByNameSportC(String name);
}
