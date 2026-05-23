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
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PythonRecommendationService {

    private final ReservationRepository reservationRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String AI_SERVICE_URL      = "http://127.0.0.1:8001/recommend";
    private static final String TERRAIN_SERVICE_URL  = "http://localhost:8088/terrain/";
    private static final DateTimeFormatter ISO_FMT   = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    // ─────────────────────────────────────────────────────────────────────────
    // Recommandations enrichies v2
    // ─────────────────────────────────────────────────────────────────────────

    public RecommendationResponseDto getRecommendations(LocalDateTime dateTime) {
        return getRecommendations(dateTime, null, null);
    }

    public RecommendationResponseDto getRecommendations(LocalDateTime dateTime,
                                                         String userId,
                                                         String sportType) {
        try {
            log.info("Fetching AI recommendations for date={}, userId={}, sport={}", dateTime, userId, sportType);

            // 1. Récupérer les terrains depuis TerrainService
            Map[] rawTerrains = restTemplate.getForObject(TERRAIN_SERVICE_URL, Map[].class);
            if (rawTerrains == null || rawTerrains.length == 0) {
                log.warn("No terrains fetched from TerrainService");
                return RecommendationResponseDto.builder().recommandations(new ArrayList<>()).build();
            }

            // 2. Récupérer toutes les réservations pour l'enrichissement
            List<Reservation> allReservations = reservationRepository.findAll();

            // 3. Historique utilisateur (si disponible)
            List<Map<String, Object>> userHistory = new ArrayList<>();
            if (userId != null && !userId.isBlank()) {
                userHistory = reservationRepository.findByIdUser(userId).stream()
                        .map(this::reservationToMap)
                        .collect(Collectors.toList());
            }

            // 4. Toutes les réservations pour le calcul de popularité
            List<Map<String, Object>> allReservationMaps = allReservations.stream()
                    .map(this::reservationToMap)
                    .collect(Collectors.toList());

            // 5. Enrichir les terrains avec les données de charge
            List<Map<String, Object>> enrichedTerrains = Arrays.stream(rawTerrains).map(t -> {
                Map<String, Object> terrain = new HashMap<>(t);
                String terrainId = t.get("id").toString();

                terrain.put("reservations_actuelles",        countActiveReservations(terrainId, dateTime));
                terrain.put("reservations_semaine_passee",   countActiveReservations(terrainId, dateTime.minusWeeks(1)));
                terrain.putIfAbsent("latitude",   36.8065);
                terrain.putIfAbsent("longitude",  10.1815);
                terrain.putIfAbsent("note_moyenne", 3.5);

                return terrain;
            }).collect(Collectors.toList());

            // 6. Construire le contexte enrichi pour Python
            Map<String, Object> context = new HashMap<>();
            if (sportType != null) context.put("sport_type", sportType);
            context.put("user_history",     userHistory);
            context.put("all_reservations", allReservationMaps);

            // 7. Construire le body de la requête
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("date_heure", dateTime.format(ISO_FMT));
            requestBody.put("terrains",   enrichedTerrains);
            requestBody.put("context",    context);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            // 8. Appel au service Python
            return restTemplate.postForObject(AI_SERVICE_URL, entity, RecommendationResponseDto.class);

        } catch (Exception e) {
            log.error("Erreur lors de la génération des recommandations", e);
            return RecommendationResponseDto.builder().recommandations(new ArrayList<>()).build();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Evaluation (v2)
    // ─────────────────────────────────────────────────────────────────────────

    public Object evaluateChoice(Map<String, Object> request, String userId) {
        try {
            log.info("Fetching AI evaluation");
            
            // Construire le contexte enrichi pour Python
            Map<String, Object> context = new HashMap<>();
            
            List<Map<String, Object>> userHistory = new ArrayList<>();
            if (userId != null && !userId.isBlank()) {
                userHistory = reservationRepository.findByIdUser(userId).stream()
                        .map(this::reservationToMap)
                        .collect(Collectors.toList());
            }
            List<Map<String, Object>> allReservationMaps = reservationRepository.findAll().stream()
                    .map(this::reservationToMap)
                    .collect(Collectors.toList());
                    
            context.put("user_history", userHistory);
            context.put("all_reservations", allReservationMaps);
            
            request.put("context", context);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            return restTemplate.postForObject("http://127.0.0.1:8001/evaluate", entity, Map.class);
        } catch (Exception e) {
            log.error("Erreur lors de l'évaluation", e);
            return Map.of("score", 0, "verdict", "Erreur de service", "raisons", new ArrayList<>(), "details", new HashMap<>());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Best Slots (v2)
    // ─────────────────────────────────────────────────────────────────────────

    public Object getBestSlots(Map<String, Object> request, String userId) {
        try {
            log.info("Fetching AI best slots");
            
            Map<String, Object> context = new HashMap<>();
            
            List<Map<String, Object>> userHistory = new ArrayList<>();
            if (userId != null && !userId.isBlank()) {
                userHistory = reservationRepository.findByIdUser(userId).stream()
                        .map(this::reservationToMap)
                        .collect(Collectors.toList());
            }
            List<Map<String, Object>> allReservationMaps = reservationRepository.findAll().stream()
                    .map(this::reservationToMap)
                    .collect(Collectors.toList());
                    
            context.put("user_history", userHistory);
            context.put("all_reservations", allReservationMaps);
            
            request.put("context", context);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            return restTemplate.postForObject("http://127.0.0.1:8001/best-slots", entity, Map.class);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des meilleurs créneaux", e);
            return Map.of("slots", new ArrayList<>());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Heatmap de disponibilités
    // ─────────────────────────────────────────────────────────────────────────

    public Object getHeatmap(String startDate, int days, String sportType,
                              String userId, List<String> terrainIds) {
        try {
            log.info("Fetching heatmap for startDate={}, days={}, sport={}", startDate, days, sportType);

            // Récupérer les terrains
            Map[] rawTerrains = restTemplate.getForObject(TERRAIN_SERVICE_URL, Map[].class);
            if (rawTerrains == null) return Map.of("heatmap", new ArrayList<>());

            // Filtrer si terrainIds fournis
            List<Map<String, Object>> filteredTerrains = Arrays.stream(rawTerrains)
                    .filter(t -> terrainIds == null || terrainIds.isEmpty()
                                 || terrainIds.contains(t.get("id").toString()))
                    .map(t -> {
                        Map<String, Object> terrain = new HashMap<>(t);
                        terrain.putIfAbsent("latitude", 36.8065);
                        terrain.putIfAbsent("longitude", 10.1815);
                        terrain.putIfAbsent("note_moyenne", 3.5);
                        return terrain;
                    })
                    .collect(Collectors.toList());

            List<String> ids = filteredTerrains.stream()
                    .map(t -> t.get("id").toString())
                    .collect(Collectors.toList());

            // Historique utilisateur
            List<Map<String, Object>> userHistory = new ArrayList<>();
            if (userId != null && !userId.isBlank()) {
                userHistory = reservationRepository.findByIdUser(userId).stream()
                        .map(this::reservationToMap).collect(Collectors.toList());
            }

            List<Map<String, Object>> allReservationMaps = reservationRepository.findAll().stream()
                    .map(this::reservationToMap).collect(Collectors.toList());

            Map<String, Object> body = new HashMap<>();
            body.put("terrain_ids",     ids);
            body.put("terrains",        filteredTerrains);
            body.put("start_date",      startDate);
            body.put("days",            days);
            body.put("sport_type",      sportType);
            body.put("user_history",    userHistory);
            body.put("all_reservations", allReservationMaps);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            return restTemplate.postForObject("http://127.0.0.1:8001/heatmap", entity, Map.class);

        } catch (Exception e) {
            log.error("Erreur lors de la génération de la heatmap", e);
            return Map.of("heatmap", new ArrayList<>());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers privés
    // ─────────────────────────────────────────────────────────────────────────

    private long countActiveReservations(String terrainId, LocalDateTime dateTime) {
        return reservationRepository.findByTerrainId(terrainId).stream()
                .filter(r -> r.getStatutR() != StatutReservation.CANCELLED)
                .filter(r -> !dateTime.isBefore(r.getStartTimeR()) && !dateTime.isAfter(r.getEndTimeR()))
                .count();
    }

    private Map<String, Object> reservationToMap(Reservation r) {
        Map<String, Object> map = new HashMap<>();
        map.put("idReservation", r.getId());
        map.put("terrainId",     r.getTerrainId());
        map.put("sportId",       r.getSportId());
        map.put("idUser",        r.getIdUser());
        map.put("startTimeR",    r.getStartTimeR() != null ? r.getStartTimeR().format(ISO_FMT) : null);
        map.put("endTimeR",      r.getEndTimeR()   != null ? r.getEndTimeR().format(ISO_FMT)   : null);
        map.put("statutR",       r.getStatutR() != null ? r.getStatutR().name() : "PENDING");
        return map;
    }
}
