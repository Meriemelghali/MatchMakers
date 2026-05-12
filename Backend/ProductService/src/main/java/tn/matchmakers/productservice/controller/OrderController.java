package tn.matchmakers.productservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.productservice.dto.OrderRequestDTO;
import tn.matchmakers.productservice.dto.OrderResponseDTO;
import tn.matchmakers.productservice.service.OrderService;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class OrderController {

    private final OrderService orderService;

    // ✅ Créer une commande (achat ou location)
    @PostMapping
    public ResponseEntity<OrderResponseDTO> createOrder(@RequestBody OrderRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.createOrder(request));
    }

    // ✅ Historique commandes d'un user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<OrderResponseDTO>> getByUser(@PathVariable String userId) {
        return ResponseEntity.ok(orderService.getOrdersByUser(userId));
    }

    // ✅ Toutes les commandes (admin)
    @GetMapping
    public ResponseEntity<List<OrderResponseDTO>> getAll() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    // ✅ Détail d'une commande
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponseDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    // ✅ Annuler une commande
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<OrderResponseDTO> cancel(@PathVariable String id) {
        return ResponseEntity.ok(orderService.cancelOrder(id));
    }
}