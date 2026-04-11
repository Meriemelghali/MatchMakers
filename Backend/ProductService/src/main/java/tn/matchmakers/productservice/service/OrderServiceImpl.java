package tn.matchmakers.productservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.productservice.dto.OrderRequestDTO;
import tn.matchmakers.productservice.dto.OrderResponseDTO;
import tn.matchmakers.productservice.entity.*;
import tn.matchmakers.productservice.repository.OrderRepository;
import tn.matchmakers.productservice.repository.ProductRepository;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    private static final double DELIVERY_FEE = 7.0;

    @Override
    public OrderResponseDTO createOrder(OrderRequestDTO request) {

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Produit introuvable"));

        if (product.getStock() < request.getQuantity())
            throw new RuntimeException("Stock insuffisant");

        double totalPrice;
        long durationHours = 0;
        double deliveryFee = 0;

        if (request.getOrderType() == OrderType.RENTAL) {
            if (request.getStartDateTime() == null || request.getEndDateTime() == null)
                throw new RuntimeException("Dates obligatoires pour une location");

            durationHours = ChronoUnit.HOURS.between(
                    request.getStartDateTime(), request.getEndDateTime()
            );
            if (durationHours <= 0)
                throw new RuntimeException("Durée minimum 1 heure");

            totalPrice = product.getRentalPricePerHour() * durationHours * request.getQuantity();
        } else {
            deliveryFee = DELIVERY_FEE;
            totalPrice  = (product.getPrice() * request.getQuantity()) + deliveryFee;
        }

        product.setStock(product.getStock() - request.getQuantity());
        product.setAvailable(product.getStock() > 0);
        productRepository.save(product);

        Order newOrder = Order.builder()
                .userId(request.getUserId())
                .productId(request.getProductId())
                .productName(product.getName())
                .quantity(request.getQuantity())
                .totalPrice(totalPrice)
                .deliveryFee(deliveryFee)
                .orderType(request.getOrderType())
                .status(OrderStatus.PENDING)
                .startDateTime(request.getStartDateTime())
                .endDateTime(request.getEndDateTime())
                .durationHours(durationHours)
                .deliveryName(request.getDeliveryName())
                .deliveryPhone(request.getDeliveryPhone())
                .deliveryAddress(request.getDeliveryAddress())
                .deliveryCity(request.getDeliveryCity())
                .pickupLocation(request.getPickupLocation())
                .pickupNote(request.getPickupNote())
                .pickupDateTime(request.getPickupDateTime())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return toDTO(orderRepository.save(newOrder));
    }

    @Override
    public List<OrderResponseDTO> getOrdersByUser(String userId) {
        return orderRepository.findByUserId(userId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<OrderResponseDTO> getAllOrders() {
        return orderRepository.findAll()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public OrderResponseDTO getOrderById(String id) {
        return orderRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Commande introuvable : " + id));
    }

    @Override
    public OrderResponseDTO cancelOrder(String id) {
        Order existingOrder = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Commande introuvable : " + id));

        if (existingOrder.getStatus() == OrderStatus.CANCELLED)
            throw new RuntimeException("Commande déjà annulée");

        productRepository.findById(existingOrder.getProductId()).ifPresent(p -> {
            p.setStock(p.getStock() + existingOrder.getQuantity());
            p.setAvailable(true);
            productRepository.save(p);
        });

        existingOrder.setStatus(OrderStatus.CANCELLED);
        existingOrder.setUpdatedAt(LocalDateTime.now());
        return toDTO(orderRepository.save(existingOrder));
    }

    private OrderResponseDTO toDTO(Order o) {
        return OrderResponseDTO.builder()
                .id(o.getId())
                .userId(o.getUserId())
                .productId(o.getProductId())
                .productName(o.getProductName())
                .quantity(o.getQuantity())
                .totalPrice(o.getTotalPrice())
                .deliveryFee(o.getDeliveryFee())
                .orderType(o.getOrderType())
                .status(o.getStatus())
                .startDateTime(o.getStartDateTime())
                .endDateTime(o.getEndDateTime())
                .durationHours(o.getDurationHours())
                .deliveryName(o.getDeliveryName())
                .deliveryPhone(o.getDeliveryPhone())
                .deliveryAddress(o.getDeliveryAddress())
                .deliveryCity(o.getDeliveryCity())
                .pickupLocation(o.getPickupLocation())
                .pickupNote(o.getPickupNote())
                .pickupDateTime(o.getPickupDateTime())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }
}