package tn.matchmakers.productservice.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AvailabilityResponseDTO {
    private boolean       available;
    private int           stockTotal;
    private int           stockReserved;
    private int           stockAvailable;
    private String        message;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
}