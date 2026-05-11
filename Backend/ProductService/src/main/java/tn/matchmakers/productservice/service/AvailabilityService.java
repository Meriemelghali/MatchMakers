package tn.matchmakers.productservice.service;

import tn.matchmakers.productservice.dto.AvailabilityResponseDTO;
import java.time.LocalDateTime;

public interface AvailabilityService {
    AvailabilityResponseDTO checkRentalAvailability(
        String productId,
        LocalDateTime startDateTime,
        LocalDateTime endDateTime,
        int quantity
    );
}