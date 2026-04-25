package tn.matchmakers.productservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.productservice.dto.AvailabilityResponseDTO;
import tn.matchmakers.productservice.entity.Order;
import tn.matchmakers.productservice.entity.Product;
import tn.matchmakers.productservice.repository.OrderRepository;
import tn.matchmakers.productservice.repository.ProductRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AvailabilityServiceImpl implements AvailabilityService {

    private final ProductRepository productRepository;
    private final OrderRepository   orderRepository;

    @Override
    public AvailabilityResponseDTO checkRentalAvailability(
            String productId,
            LocalDateTime startDateTime,
            LocalDateTime endDateTime,
            int quantity) {

        // 1. Vérifier que le produit existe
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Produit introuvable"));

        // 2. Vérifier que le produit est louable
        if (product.getType().name().equals("SALE")) {
            return AvailabilityResponseDTO.builder()
                .available(false)
                .stockTotal(product.getStock())
                .stockReserved(0)
                .stockAvailable(0)
                .message("Ce produit n'est pas disponible à la location")
                .startDateTime(startDateTime)
                .endDateTime(endDateTime)
                .build();
        }

        // 3. Vérifier stock total
        if (product.getStock() == 0) {
            return AvailabilityResponseDTO.builder()
                .available(false)
                .stockTotal(0)
                .stockReserved(0)
                .stockAvailable(0)
                .message("Stock épuisé")
                .startDateTime(startDateTime)
                .endDateTime(endDateTime)
                .build();
        }

        // 4. Trouver les locations qui chevauchent la période
        List<Order> overlapping = orderRepository.findOverlappingRentals(
            productId, startDateTime, endDateTime
        );

        // 5. Calculer la quantité déjà réservée sur cette période
        int reserved = overlapping.stream()
            .mapToInt(Order::getQuantity)
            .sum();

        int stockAvailable = product.getStock() - reserved;

        // 6. Vérifier si la quantité demandée est disponible
        if (stockAvailable <= 0) {
            return AvailabilityResponseDTO.builder()
                .available(false)
                .stockTotal(product.getStock())
                .stockReserved(reserved)
                .stockAvailable(0)
                .message("Aucune unité disponible sur cette période")
                .startDateTime(startDateTime)
                .endDateTime(endDateTime)
                .build();
        }

        if (quantity > stockAvailable) {
            return AvailabilityResponseDTO.builder()
                .available(false)
                .stockTotal(product.getStock())
                .stockReserved(reserved)
                .stockAvailable(stockAvailable)
                .message("Seulement " + stockAvailable + " unité(s) disponible(s) sur cette période")
                .startDateTime(startDateTime)
                .endDateTime(endDateTime)
                .build();
        }

        // 7. Disponible ✅
        return AvailabilityResponseDTO.builder()
            .available(true)
            .stockTotal(product.getStock())
            .stockReserved(reserved)
            .stockAvailable(stockAvailable)
            .message(stockAvailable + " unité(s) disponible(s) sur cette période")
            .startDateTime(startDateTime)
            .endDateTime(endDateTime)
            .build();
    }
}