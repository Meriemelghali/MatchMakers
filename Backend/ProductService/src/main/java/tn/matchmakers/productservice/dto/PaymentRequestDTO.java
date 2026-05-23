package tn.matchmakers.productservice.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentRequestDTO {
    private String orderId;
    private String paymentMethodId; // token Stripe
}