package tn.matchmakers.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventNotificationDto {
    private String title;
    private String description;
    private String location;
    private String sportName;
    private LocalDate startDate;
    private LocalDate endDate;
}
