package tn.matchmakers.productservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;         
import org.springframework.stereotype.Repository;
import tn.matchmakers.productservice.entity.Order;
import tn.matchmakers.productservice.entity.OrderStatus;
import tn.matchmakers.productservice.entity.OrderType;
import java.time.LocalDateTime;                                    
import java.util.List;

@Repository
public interface OrderRepository extends MongoRepository<Order, String> {
    List<Order> findByUserId(String userId);
    List<Order> findByProductId(String productId);
    List<Order> findByUserIdAndStatus(String userId, OrderStatus status);
    long countByProductId(String productId);
    @Query("{ 'productId': ?0, " +
           "  'orderType': 'RENTAL', " +
           "  'status': { $in: ['PENDING', 'CONFIRMED'] }, " +
           "  'startDateTime': { $lt: ?2 }, " +
           "  'endDateTime':   { $gt: ?1 } }")
    List<Order> findOverlappingRentals(
        String productId,
        LocalDateTime startDateTime,
        LocalDateTime endDateTime
    );
    
}