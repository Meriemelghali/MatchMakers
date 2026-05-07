package tn.matchmakers.reservationservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tn.matchmakers.reservationservice.dto.RecommendationResponseDto;
import tn.matchmakers.reservationservice.entities.Reservation;
import tn.matchmakers.reservationservice.entities.StatutReservation;
import tn.matchmakers.reservationservice.repository.ReservationRepository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PythonRecommendationService {

    private final ReservationRepository reservationRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    // URLs des microservices
    private static final String AI_SERVICE_URL = "http://127.0.0.1:8001/recommend";
    private static final String TERRAIN_SERVICE_URL = "http://localhost:8088/terrain/";

    public RecommendationResponseDto getRecommendations(LocalDateTime dateTime) {
        try {
            log.info("Fetching recommendations from AI service for date: {}", dateTime);

            // 1. Récupérer les terrains depuis le microservice TerrainService (car ils sont dans une base différente)
            Map[] rawTerrains = restTemplate.getForObject(TERRAIN_SERVICE_URL, Map[].class);
            if (rawTerrains == null || rawTerrains.length == 0) {
                log.warn("Aucun terrain récupéré depuis TerrainService");
                return RecommendationResponseDto.builder().recommandations(new ArrayList<>()).build();
            }
            
            // 2. Enrichir avec les données de réservation locales
            List<Map<String, Object>> enrichedTerrains = Arrays.stream(rawTerrains).map(t -> {
                Map<String, Object> terrain = new HashMap<>(t);
                // Le DTO du TerrainService contient généralement 'id'
                String terrainId = t.get("id").toString();
                
                terrain.put("reservations_actuelles", countReservations(terrainId, dateTime));
                terrain.put("reservations_semaine_passee", countReservations(terrainId, dateTime.minusWeeks(1)));
                
                // On s'assure d'avoir les infos météo de base si absentes
                terrain.putIfAbsent("latitude", 36.8065); // Tunis par défaut
                terrain.putIfAbsent("longitude", 10.1815);
                terrain.putIfAbsent("note_moyenne", 4.0);
                
                return terrain;
            }).collect(Collectors.toList());

            // 3. Préparer la requête pour Python
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("date_heure", dateTime.toString());
            requestBody.put("terrains", enrichedTerrains);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            // 4. Appel au service Python
            return restTemplate.postForObject(AI_SERVICE_URL, entity, RecommendationResponseDto.class);

        } catch (Exception e) {
            log.error("Erreur critique lors de la génération des recommandations", e);
            return RecommendationResponseDto.builder().recommandations(new ArrayList<>()).build();
        }
    }

    private long countReservations(String terrainId, LocalDateTime dateTime) {
        List<Reservation> res = reservationRepository.findByTerrainId(terrainId);
        return res.stream()
                .filter(r -> r.getStatutR() != StatutReservation.CANCELLED)
                .filter(r -> !dateTime.isBefore(r.getStartTimeR()) && !dateTime.isAfter(r.getEndTimeR()))
                .count();
    }
}
