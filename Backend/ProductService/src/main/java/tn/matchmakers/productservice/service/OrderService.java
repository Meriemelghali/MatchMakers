package tn.matchmakers.productservice.service;

import tn.matchmakers.productservice.dto.OrderRequestDTO;
import tn.matchmakers.productservice.dto.OrderResponseDTO;

import java.util.List;

public interface OrderService {

    OrderResponseDTO createOrder(OrderRequestDTO request);

    List<OrderResponseDTO> getOrdersByUser(String userId);

    List<OrderResponseDTO> getAllOrders();

    OrderResponseDTO getOrderById(String id);

    OrderResponseDTO cancelOrder(String id);
    OrderResponseDTO confirmDelivery(String id);
}