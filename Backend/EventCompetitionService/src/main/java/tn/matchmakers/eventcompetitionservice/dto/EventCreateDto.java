package tn.matchmakers.eventcompetitionservice.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class EventCreateDto {
    @NotBlank(message = "Le nom de l'evenement est requis")
    private String name;

    @NotBlank(message = "La description de l'evenement est requis")
    private String description;

    @NotBlank(message = "La location de l'evenement est requis")
    private String location;

    @NotNull(message = "La date de début est requise")
    @FutureOrPresent(message = "La date de début ne peut pas être dans le passé")
    private LocalDate startDate;

    @NotNull(message = "La date de fin est requise")
    private LocalDate endDate;

    @NotBlank(message = "L'id du créateur est requis")
    private String createdBy;
}
