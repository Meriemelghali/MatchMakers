package tn.matchmakers.productservice.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tn.matchmakers.productservice.dto.OrderResponseDTO;
import tn.matchmakers.productservice.dto.PaymentResponseDTO;
import tn.matchmakers.productservice.entity.*;
import tn.matchmakers.productservice.repository.OrderRepository;
import tn.matchmakers.productservice.repository.ProductRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final OrderRepository          orderRepository;
    private final ProductRepository        productRepository;
    private final EmailNotificationService emailNotificationService;
    private final CurrentUserService       currentUserService;

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @PostConstruct
    public void init() { Stripe.apiKey = stripeSecretKey; }

    @Override
    public PaymentResponseDTO createPaymentIntent(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Commande introuvable"));

        Product product = productRepository.findById(order.getProductId())
                .orElseThrow(() -> new RuntimeException("Produit introuvable"));

        if (product.getStock() < order.getQuantity()) {
            throw new RuntimeException("Stock insuffisant");
        }

        try {
            long amountInCents = (long) (order.getTotalPrice() * 100);
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency("usd")
                    .setDescription("Commande #" + orderId)
                    .putMetadata("orderId", orderId)
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);
            order.setPaymentIntentId(paymentIntent.getId());
            order.setPaymentMethod(PaymentMethod.CARD);
            order.setPaymentStatus(PaymentStatus.PENDING);
            orderRepository.save(order);

            return PaymentResponseDTO.builder()
                    .orderId(orderId)
                    .clientSecret(paymentIntent.getClientSecret())
                    .status("pending")
                    .amount(order.getTotalPrice())
                    .currency("usd")
                    .build();

        } catch (StripeException e) {
            throw new RuntimeException("Erreur Stripe : " + e.getMessage());
        }
    }

    @Override
    public PaymentResponseDTO confirmPayment(String orderId, String paymentIntentId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Commande introuvable"));

        try {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);

            if ("succeeded".equals(paymentIntent.getStatus())) {
                order.setPaymentStatus(PaymentStatus.PAID);
                order.setStatus(OrderStatus.CONFIRMED);
                decrementStock(order.getProductId(), order.getQuantity());

                String userEmail    = currentUserService.getCurrentUserEmail();
                String userFullName = currentUserService.getCurrentUserFullName();
                emailNotificationService.sendPaymentConfirmed(
                        userEmail, userFullName, convertOrderToDTO(order));
            } else {
                order.setPaymentStatus(PaymentStatus.FAILED);
            }

            orderRepository.save(order);

            return PaymentResponseDTO.builder()
                    .orderId(orderId)
                    .status(paymentIntent.getStatus())
                    .amount(order.getTotalPrice())
                    .currency("usd")
                    .build();

        } catch (StripeException e) {
            throw new RuntimeException("Erreur Stripe : " + e.getMessage());
        }
    }

    @Override
    public PaymentResponseDTO cashPayment(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Commande introuvable"));

        Product product = productRepository.findById(order.getProductId())
                .orElseThrow(() -> new RuntimeException("Produit introuvable"));

        if (product.getStock() < order.getQuantity()) {
            throw new RuntimeException("Stock insuffisant");
        }

        order.setPaymentMethod(PaymentMethod.CASH);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setStatus(OrderStatus.PENDING);
        orderRepository.save(order);

        return PaymentResponseDTO.builder()
                .orderId(orderId)
                .status("pending_delivery")
                .amount(order.getTotalPrice())
                .currency("tnd")
                .build();
    }

    @Override
    public PaymentResponseDTO confirmDelivery(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Commande introuvable"));

        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new RuntimeException("Livraison déjà confirmée");
        }

        decrementStock(order.getProductId(), order.getQuantity());

        order.setStatus(OrderStatus.DELIVERED);
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        return PaymentResponseDTO.builder()
                .orderId(orderId)
                .status("delivered")
                .amount(order.getTotalPrice())
                .currency("tnd")
                .build();
    }

    private void decrementStock(String productId, int quantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Produit introuvable"));

        int newStock = product.getStock() - quantity;
        if (newStock < 0) throw new RuntimeException("Stock insuffisant");

        product.setStock(newStock);
        product.setAvailable(newStock > 0);
        product.setUpdatedAt(LocalDateTime.now());
        productRepository.save(product);
    }

    private OrderResponseDTO convertOrderToDTO(Order o) {
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