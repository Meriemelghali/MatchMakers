package tn.matchmakers.productservice.dto;

import lombok.Getter;
import lombok.Setter;
import tn.matchmakers.productservice.entity.OrderType;
import java.time.LocalDateTime;

@Getter
@Setter
public class OrderRequestDTO {
    private String userId;
    private String productId;
    private int quantity;
    private OrderType orderType;      // PURCHASE ou RENTAL
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;

    private String deliveryName;
    private String deliveryPhone;
    private String deliveryAddress;
    private String deliveryCity;
    // Retrait (RENTAL)
    private String pickupLocation;
    private String pickupNote;
    private LocalDateTime pickupDateTime;
}