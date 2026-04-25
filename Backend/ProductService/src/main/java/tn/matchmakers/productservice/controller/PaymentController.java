package tn.matchmakers.productservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.productservice.dto.PaymentResponseDTO;
import tn.matchmakers.productservice.service.PaymentService;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/create-intent/{orderId}")
    public ResponseEntity<PaymentResponseDTO> createIntent(
            @PathVariable String orderId) {
        return ResponseEntity.ok(paymentService.createPaymentIntent(orderId));
    }

    @PostMapping("/confirm")
    public ResponseEntity<PaymentResponseDTO> confirm(
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            paymentService.confirmPayment(
                body.get("orderId"),
                body.get("paymentIntentId")
            )
        );
    }

    @PostMapping("/cash/{orderId}")
    public ResponseEntity<PaymentResponseDTO> cash(
            @PathVariable String orderId) {
        return ResponseEntity.ok(paymentService.cashPayment(orderId));
    }

    // ✅ Admin confirme livraison — sans @PreAuthorize
    @PostMapping("/confirm-delivery/{orderId}")
    public ResponseEntity<PaymentResponseDTO> confirmDelivery(
            @PathVariable String orderId) {
        return ResponseEntity.ok(paymentService.confirmDelivery(orderId));
    }
    
}