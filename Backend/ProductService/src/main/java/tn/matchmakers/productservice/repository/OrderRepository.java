package tn.matchmakers.productservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tn.matchmakers.productservice.entity.Order;
import tn.matchmakers.productservice.entity.OrderStatus;
import java.util.List;

@Repository
public interface OrderRepository extends MongoRepository<Order, String> {
    List<Order> findByUserId(String userId);
    List<Order> findByProductId(String productId);
    List<Order> findByUserIdAndStatus(String userId, OrderStatus status);
}