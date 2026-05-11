package tn.matchmakers.productservice.service;

import tn.matchmakers.productservice.dto.PaymentResponseDTO;

public interface PaymentService {
    PaymentResponseDTO createPaymentIntent(String orderId);
    PaymentResponseDTO confirmPayment(String orderId, String paymentIntentId);
    PaymentResponseDTO cashPayment(String orderId);
    PaymentResponseDTO confirmDelivery(String orderId); 
}