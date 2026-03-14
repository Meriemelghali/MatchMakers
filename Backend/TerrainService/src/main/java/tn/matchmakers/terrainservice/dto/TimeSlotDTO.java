package tn.matchmakers.terrainservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeSlotDTO {
    private DayOfWeek jour;
    private LocalTime heureOuverture;
    private LocalTime heureFermeture;
    private boolean actif;
}
