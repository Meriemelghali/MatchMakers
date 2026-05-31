package tn.matchmakers.productservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tn.matchmakers.productservice.entity.Product;
import java.util.List;

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {
    List<Product> findBySport(String sport);
    List<Product> findByNameContainingIgnoreCase(String name);
}