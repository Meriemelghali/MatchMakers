package tn.matchmakers.productservice.dto;

import lombok.*;
import tn.matchmakers.productservice.entity.ProductType;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponseDTO {
    private String id;
    private String name;
    private String description;
    private double price;
    private double rentalPricePerDay;
    private int stock;
    private String imageUrl;
    private String sport;
    private String clubId;
    private ProductType type;
    private boolean available;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}