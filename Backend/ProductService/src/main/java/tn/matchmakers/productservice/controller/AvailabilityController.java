package tn.matchmakers.productservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.productservice.dto.AvailabilityResponseDTO;
import tn.matchmakers.productservice.service.AvailabilityService;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/availability")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    @GetMapping("/rental/{productId}")
    public ResponseEntity<AvailabilityResponseDTO> checkRental(
            @PathVariable String productId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                LocalDateTime startDateTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                LocalDateTime endDateTime,
            @RequestParam(defaultValue = "1") int quantity) {

        return ResponseEntity.ok(
            availabilityService.checkRentalAvailability(
                productId, startDateTime, endDateTime, quantity
            )
        );
    }
}