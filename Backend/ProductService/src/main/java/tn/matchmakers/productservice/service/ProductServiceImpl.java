package tn.matchmakers.productservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.productservice.dto.ProductRequestDTO;
import tn.matchmakers.productservice.dto.ProductResponseDTO;
import tn.matchmakers.productservice.entity.Product;
import tn.matchmakers.productservice.repository.ProductRepository;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;

    private Product toEntity(ProductRequestDTO dto) {
        Product p = new Product();
        p.setName(dto.getName());
        p.setDescription(dto.getDescription());
        p.setPrice(dto.getPrice());
        p.setRentalPricePerHour(dto.getRentalPricePerHour());
        p.setStock(dto.getStock());
        p.setImageUrl(dto.getImageUrl());
        p.setSport(dto.getSport());
        p.setType(dto.getType());
        return p;
    }

    private ProductResponseDTO toDTO(Product p) {
        return ProductResponseDTO.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .price(p.getPrice())
                .rentalPricePerHour(p.getRentalPricePerHour())
                .stock(p.getStock())
                .imageUrl(p.getImageUrl())
                .sport(p.getSport())
                .type(p.getType())
                .available(p.isAvailable())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    @Override
    public ProductResponseDTO addProduct(ProductRequestDTO dto) {
        Product product = toEntity(dto);
        product.setAvailable(dto.getStock() > 0);
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());
        return toDTO(productRepository.save(product));
    }

    @Override
    public ProductResponseDTO updateProduct(String id, ProductRequestDTO dto) {
        Product existing = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit introuvable : " + id));
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setPrice(dto.getPrice());
        existing.setRentalPricePerHour(dto.getRentalPricePerHour());
        existing.setStock(dto.getStock());
        existing.setImageUrl(dto.getImageUrl());
        existing.setSport(dto.getSport());
        existing.setType(dto.getType());
        existing.setAvailable(dto.getStock() > 0);
        existing.setUpdatedAt(LocalDateTime.now());
        // ❌ clubId supprimé
        return toDTO(productRepository.save(existing));
    }

    @Override
    public void deleteProduct(String id) {
        if (!productRepository.existsById(id))
            throw new RuntimeException("Produit introuvable : " + id);
        productRepository.deleteById(id);
    }

    @Override
    public ProductResponseDTO getProductById(String id) {
        return productRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Produit introuvable : " + id));
    }

    @Override
    public List<ProductResponseDTO> getAllProducts() {
        return productRepository.findAll()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<ProductResponseDTO> getProductsBySportType(String sportType) {
        return productRepository.findBySport(sportType)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<ProductResponseDTO> searchProductsByName(String name) {
        return productRepository.findByNameContainingIgnoreCase(name)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }
}