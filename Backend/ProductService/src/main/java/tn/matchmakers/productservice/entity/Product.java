package tn.matchmakers.productservice.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
@Document(collection = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {
    @Id
    private String id;
    private String name;
    private String description;
    private double price;
    private double rentalPricePerDay;
    private int stock;
    private String imageUrl;
    private String sport;
    private ProductType type;
    private boolean available;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}