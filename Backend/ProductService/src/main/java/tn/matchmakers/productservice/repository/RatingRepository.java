package tn.matchmakers.productservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tn.matchmakers.productservice.entity.Rating;
import java.util.List;
import java.util.Optional;

@Repository
public interface RatingRepository extends MongoRepository<Rating, String> {
    List<Rating>     findByProductId(String productId);
    Optional<Rating> findByProductIdAndUserId(String productId, String userId);
    void             deleteByProductId(String productId);
}