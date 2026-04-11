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
import tn.matchmakers.productservice.entity.*;
import tn.matchmakers.productservice.repository.OrderRepository;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final OrderRepository orderRepository;

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
}