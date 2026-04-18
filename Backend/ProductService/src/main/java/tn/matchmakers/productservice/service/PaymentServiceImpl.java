package tn.matchmakers.productservice.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tn.matchmakers.productservice.dto.PaymentResponseDTO;
import tn.matchmakers.productservice.dto.OrderResponseDTO;
import tn.matchmakers.productservice.entity.*;
import tn.matchmakers.productservice.repository.OrderRepository;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final OrderRepository orderRepository;
    private final EmailNotificationService emailNotificationService;
    private final CurrentUserService currentUserService;

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    // ✅ Créer un PaymentIntent Stripe
    @Override
    public PaymentResponseDTO createPaymentIntent(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Commande introuvable"));

        try {
            // Stripe travaille en centimes
            long amountInCents = (long) (order.getTotalPrice() * 100);

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency("usd") // TND pas supporté par Stripe — on utilise USD en test
                    .setDescription("Commande #" + orderId)
                    .putMetadata("orderId", orderId)
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);

            // Sauvegarder le PaymentIntent ID
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

    // ✅ Confirmer paiement après Stripe.js
    @Override
    public PaymentResponseDTO confirmPayment(String orderId, String paymentIntentId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Commande introuvable"));

        try {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);

            if ("succeeded".equals(paymentIntent.getStatus())) {
                order.setPaymentStatus(PaymentStatus.PAID);
                order.setStatus(OrderStatus.CONFIRMED);
            } else {
                order.setPaymentStatus(PaymentStatus.FAILED);
            }

            orderRepository.save(order);

            // ✅ Email paiement confirmé — email du user connecté
            if ("succeeded".equals(paymentIntent.getStatus())) {
                String userEmail    = currentUserService.getCurrentUserEmail();
                String userFullName = currentUserService.getCurrentUserFullName();
                OrderResponseDTO orderDTO = convertOrderToDTO(order);
                emailNotificationService.sendPaymentConfirmed(userEmail, userFullName, orderDTO);
            }

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

    // ✅ Paiement Cash — confirmer directement
    @Override
    public PaymentResponseDTO cashPayment(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Commande introuvable"));

        order.setPaymentMethod(PaymentMethod.CASH);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);

        return PaymentResponseDTO.builder()
                .orderId(orderId)
                .status("confirmed")
                .amount(order.getTotalPrice())
                .currency("tnd")
                .build();
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