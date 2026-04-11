package tn.matchmakers.productservice.dto;

import lombok.Data;
import tn.matchmakers.productservice.entity.ProductType;

@Data
public class ProductRequestDTO {
    private String name;
    private String description;
    private double price;
    private double rentalPricePerHour;
    private int stock;
    private String imageUrl;
    private String sport;
    private ProductType type;          // SALE, RENTAL, BOTH
}