package tn.matchmakers.productservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.productservice.dto.OrderRequestDTO;
import tn.matchmakers.productservice.dto.OrderResponseDTO;
import tn.matchmakers.productservice.entity.*;
import tn.matchmakers.productservice.repository.OrderRepository;
import tn.matchmakers.productservice.repository.ProductRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    @Override
    public OrderResponseDTO createOrder(OrderRequestDTO request) {

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (request.getPaymentMethod() == PaymentMethod.CARD) {
    if (product.getStock() < request.getQuantity()) {
        throw new RuntimeException("Insufficient stock");
    }

    product.setStock(product.getStock() - request.getQuantity());
    productRepository.save(product);
}

        double totalPrice;

        if (request.getOrderType() == OrderType.RENTAL) {
            long hours = java.time.Duration.between(
                    request.getStartDateTime(),
                    request.getEndDateTime()
            ).toHours();

            totalPrice = product.getRentalPricePerHour() * request.getQuantity() * hours;
        } else {
            totalPrice = product.getPrice() * request.getQuantity();
        }

        Order order = Order.builder()
                .userId(request.getUserId())
                .productId(product.getId())
                .productName(product.getName())
                .quantity(request.getQuantity())
                .orderType(request.getOrderType())
                .status(OrderStatus.PENDING)
                .paymentStatus(PaymentStatus.PENDING)
                .paymentMethod(request.getPaymentMethod())
                .totalPrice(totalPrice)
                .startDateTime(request.getStartDateTime())
                .endDateTime(request.getEndDateTime())
                .deliveryName(request.getDeliveryName())
                .deliveryPhone(request.getDeliveryPhone())
                .deliveryAddress(request.getDeliveryAddress())
                .deliveryCity(request.getDeliveryCity())
                .pickupLocation(request.getPickupLocation())
                .pickupNote(request.getPickupNote())
                .pickupDateTime(request.getPickupDateTime())
                .createdAt(LocalDateTime.now())
                .build();

        return mapToResponse(orderRepository.save(order));
    }

    // ===================== CONFIRM DELIVERY =====================
    @Override
public OrderResponseDTO confirmDelivery(String id) {

    Order order = orderRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Order not found"));

    // 🔥 Si CASH → diminuer stock ici
    if (order.getPaymentMethod() == PaymentMethod.CASH) {

        Product product = productRepository.findById(order.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (product.getStock() < order.getQuantity()) {
            throw new RuntimeException("Insufficient stock at confirmation");
        }

        product.setStock(product.getStock() - order.getQuantity());
        productRepository.save(product);
    }

    // Mise à jour commande
    order.setStatus(OrderStatus.DELIVERED);
    order.setPaymentStatus(PaymentStatus.PAID);

    return mapToResponse(orderRepository.save(order));
}

    // ===================== CANCEL =====================
    @Override
    public OrderResponseDTO cancelOrder(String id) {

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        order.setStatus(OrderStatus.CANCELLED);
        order.setPaymentStatus(PaymentStatus.FAILED);

        return mapToResponse(orderRepository.save(order));
    }

    // ===================== GET =====================
    @Override
    public List<OrderResponseDTO> getAllOrders() {
        return orderRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public OrderResponseDTO getOrderById(String id) {
        return orderRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }

    @Override
    public List<OrderResponseDTO> getOrdersByUser(String userId) {
        return orderRepository.findByUserId(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ===================== MAPPER =====================
    private OrderResponseDTO mapToResponse(Order order) {
        return OrderResponseDTO.builder()
                .id(order.getId())
                .userId(order.getUserId())
                .productId(order.getProductId())
                .productName(order.getProductName())
                .quantity(order.getQuantity())
                .orderType(order.getOrderType())
                .status(order.getStatus())
                .paymentStatus(order.getPaymentStatus())
                .paymentMethod(order.getPaymentMethod())
                .totalPrice(order.getTotalPrice())
                .startDateTime(order.getStartDateTime())
                .endDateTime(order.getEndDateTime())
                .deliveryName(order.getDeliveryName())
                .deliveryPhone(order.getDeliveryPhone())
                .deliveryAddress(order.getDeliveryAddress())
                .deliveryCity(order.getDeliveryCity())
                .pickupLocation(order.getPickupLocation())
                .pickupNote(order.getPickupNote())
                .pickupDateTime(order.getPickupDateTime())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}