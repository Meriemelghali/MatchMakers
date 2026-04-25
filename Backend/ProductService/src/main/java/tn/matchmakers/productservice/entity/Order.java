package tn.matchmakers.productservice.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    private String id;

    private String userId;
    private String productId;
    private String productName;
    private int quantity;
    private double totalPrice;
    private double deliveryFee;
    private OrderType orderType;    // PURCHASE ou RENTAL
    private OrderStatus status;     // PENDING, CONFIRMED, CANCELLED, DELIVERED
    private PaymentMethod paymentMethod;  
    private PaymentStatus paymentStatus;  
    private String paymentIntentId;  
    // Infos livraison
    private String deliveryName;
    private String deliveryPhone;
    private String deliveryAddress;
    private String deliveryCity;
    
    //Retrait sur place 
    private String pickupLocation;
    private String pickupNote;
    private LocalDateTime pickupDateTime;

    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private long durationHours;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}