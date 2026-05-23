package tn.matchmakers.productservice.dto;

import lombok.*;
import tn.matchmakers.productservice.entity.OrderStatus;
import tn.matchmakers.productservice.entity.OrderType;
import java.time.LocalDateTime;
import tn.matchmakers.productservice.entity.PaymentMethod;
import tn.matchmakers.productservice.entity.PaymentStatus;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponseDTO {
    private String id;
    private String userId;
    private String productId;
    private String productName;
    private int quantity;
    private double totalPrice;
    private double deliveryFee;
    private OrderType orderType;
    private OrderStatus status;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private long durationHours;
    private String deliveryName;
    private String deliveryPhone;
    private String deliveryAddress;
    private String deliveryCity;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String pickupLocation;
    private String pickupNote;
    private LocalDateTime pickupDateTime;
    private PaymentMethod paymentMethod;
private PaymentStatus paymentStatus;
}