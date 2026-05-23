package tn.matchmakers.productservice.service;

import tn.matchmakers.productservice.dto.ProductRequestDTO;
import tn.matchmakers.productservice.dto.ProductResponseDTO;
import java.util.List;

public interface ProductService {
    ProductResponseDTO addProduct(ProductRequestDTO dto);
    ProductResponseDTO updateProduct(String id, ProductRequestDTO dto);
    void deleteProduct(String id);
    ProductResponseDTO getProductById(String id);
    List<ProductResponseDTO> getAllProducts();
    List<ProductResponseDTO> getProductsBySportType(String sport);
    List<ProductResponseDTO> searchProductsByName(String name);
}