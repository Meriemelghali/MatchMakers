package tn.matchmakers.terrainservice.entity;

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
public class TimeSlot {
    private DayOfWeek jour;
    private LocalTime heureOuverture;
    private LocalTime heureFermeture;
    private boolean actif;
}
