package tn.matchmakers.productservice.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class PaymentResponseDTO {
    private String orderId;
    private String status;        // succeeded / failed
    private String clientSecret;  // pour Stripe.js
    private double amount;
    private String currency;
}