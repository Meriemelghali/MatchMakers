package tn.matchmakers.matchservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import tn.matchmakers.matchservice.config.RabbitMQConfig;
import tn.matchmakers.matchservice.dto.*;
import tn.matchmakers.matchservice.entity.Match;
import tn.matchmakers.matchservice.entity.MatchEvent;
import tn.matchmakers.matchservice.enums.EventType;
import tn.matchmakers.matchservice.enums.MatchStatus;
import tn.matchmakers.matchservice.enums.MatchType;
import tn.matchmakers.matchservice.repository.MatchRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchServiceImpl implements MatchService {

    private final MatchRepository matchRepository;
    private final RabbitTemplate rabbitTemplate;

    // ---- CRUD ----------------------------------------------------------------

    @Override
    public MatchDTO creerMatch(CreateMatchRequest req) {
        validerDuree(req.getDateDebut(), req.getDateFin());
        if (req.getTerrainId() != null) {
            verifierChevauchement(req.getTerrainId(), req.getDateDebut(), req.getDateFin(), null);
        }
        Match match = Match.builder()
                .titre(req.getTitre())
                .equipe1(req.getEquipe1())
                .equipe2(req.getEquipe2())
                .dateDebut(req.getDateDebut())
                .dateFin(req.getDateFin())
                .type(req.getType())
                .arbitre(req.getArbitre())
                .description(req.getDescription())
                .capaciteSpectateurs(req.getCapaciteSpectateurs())
                .terrainId(req.getTerrainId())
                .build();
        Match saved = matchRepository.save(match);
        publierEvenement("match.created", saved);
        return toDTO(saved);
    }

    @Override
    public MatchDTO obtenirMatch(String id) {
        return toDTO(trouverMatch(id));
    }

    @Override
    public List<MatchDTO> obtenirTousLesMatchs() {
        return matchRepository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public MatchDTO mettreAJourMatch(String id, CreateMatchRequest req) {
        Match match = trouverMatch(id);
        validerDuree(req.getDateDebut(), req.getDateFin());
        if (req.getTerrainId() != null) {
            verifierChevauchement(req.getTerrainId(), req.getDateDebut(), req.getDateFin(), id);
        }
        match.setTitre(req.getTitre());
        match.setEquipe1(req.getEquipe1());
        match.setEquipe2(req.getEquipe2());
        match.setDateDebut(req.getDateDebut());
        match.setDateFin(req.getDateFin());
        match.setType(req.getType());
        match.setArbitre(req.getArbitre());
        match.setDescription(req.getDescription());
        match.setCapaciteSpectateurs(req.getCapaciteSpectateurs());
        match.setTerrainId(req.getTerrainId());
        match.setUpdatedAt(LocalDateTime.now());
        Match saved = matchRepository.save(match);
        publierEvenement("match.updated", saved);
        return toDTO(saved);
    }

    @Override
    public void supprimerMatch(String id) {
        Match match = trouverMatch(id);
        matchRepository.delete(match);
        publierEvenement("match.deleted", match);
    }

    // ---- SCORE ---------------------------------------------------------------

    @Override
    public MatchDTO mettreAJourScore(String id, UpdateScoreRequest req) {
        Match match = trouverMatch(id);
        if (match.getStatut() != MatchStatus.EN_COURS) {
            throw new IllegalStateException("La mise à jour du score n'est autorisée que pour les matchs EN_COURS");
        }
        match.setScoreEquipe1(req.getScoreEquipe1());
        match.setScoreEquipe2(req.getScoreEquipe2());
        match.setUpdatedAt(LocalDateTime.now());
        Match saved = matchRepository.save(match);
        publierEvenement("match.score.updated", saved);
        return toDTO(saved);
    }

    // ---- STATUS --------------------------------------------------------------

    @Override
    public MatchDTO mettreAJourStatut(String id, UpdateStatusRequest req) {
        Match match = trouverMatch(id);
        validerTransitionStatut(match.getStatut(), req.getStatut());
        match.setStatut(req.getStatut());
        match.setUpdatedAt(LocalDateTime.now());
        Match saved = matchRepository.save(match);
        publierEvenement("match.status.updated", saved);
        return toDTO(saved);
    }

    // ---- FILTERS -------------------------------------------------------------

    @Override
    public List<MatchDTO> filtrerParStatut(MatchStatus statut) {
        return matchRepository.findByStatut(statut).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<MatchDTO> filtrerParType(MatchType type) {
        return matchRepository.findByType(type).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<MatchDTO> filtrerParTerrain(String terrainId) {
        return matchRepository.findByTerrainId(terrainId).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<MatchDTO> filtrerParPeriode(LocalDateTime debut, LocalDateTime fin) {
        return matchRepository.findByDateDebutBetween(debut, fin).stream().map(this::toDTO)
                .collect(Collectors.toList());
    }

    // ---- EVENTS --------------------------------------------------------------

    @Override
    public MatchDTO ajouterEvenement(String matchId, AddEventRequest req) {
        Match match = trouverMatch(matchId);
        if (match.getStatut() != MatchStatus.EN_COURS) {
            throw new IllegalStateException("Les événements ne peuvent être ajoutés qu'aux matchs EN_COURS");
        }
        MatchEvent event = MatchEvent.builder()
                .type(req.getType())
                .minute(req.getMinute())
                .joueur(req.getJoueur())
                .equipe(req.getEquipe())
                .description(req.getDescription())
                .build();

        // Auto-increment score on BUT
        if (req.getType() == EventType.BUT) {
            if ("equipe1".equals(req.getEquipe())) {
                match.setScoreEquipe1(match.getScoreEquipe1() + 1);
            } else if ("equipe2".equals(req.getEquipe())) {
                match.setScoreEquipe2(match.getScoreEquipe2() + 1);
            }
        }

        match.getEvenements().add(event);
        match.setUpdatedAt(LocalDateTime.now());
        Match saved = matchRepository.save(match);
        publierEvenement("match.event.added", saved);
        return toDTO(saved);
    }

    @Override
    public List<MatchEventDTO> obtenirEvenements(String matchId) {
        return trouverMatch(matchId).getEvenements().stream()
                .map(this::toEventDTO)
                .collect(Collectors.toList());
    }

    @Override
    public MatchDTO supprimerEvenement(String matchId, String eventId) {
        Match match = trouverMatch(matchId);
        match.getEvenements().removeIf(e -> e.getId().equals(eventId));
        match.setUpdatedAt(LocalDateTime.now());
        return toDTO(matchRepository.save(match));
    }

    // ---- PRIVATE HELPERS -----------------------------------------------------

    private Match trouverMatch(String id) {
        return matchRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Match introuvable: " + id));
    }

    private void validerDuree(LocalDateTime debut, LocalDateTime fin) {
        if (fin.isBefore(debut) || fin.equals(debut)) {
            throw new IllegalArgumentException("La date de fin doit être postérieure à la date de début");
        }
        long minutes = Duration.between(debut, fin).toMinutes();
        if (minutes < 30) {
            throw new IllegalArgumentException("La durée minimale d'un match est de 30 minutes");
        }
        if (minutes > 240) {
            throw new IllegalArgumentException("La durée maximale d'un match est de 4 heures");
        }
    }

    private void verifierChevauchement(String terrainId, LocalDateTime debut, LocalDateTime fin, String excludeId) {
        List<Match> existing = matchRepository.findOverlappingMatches(terrainId, debut, fin);
        boolean conflict = existing.stream()
                .anyMatch(m -> !m.getId().equals(excludeId)
                        && m.getStatut() != MatchStatus.ANNULE
                        && m.getStatut() != MatchStatus.TERMINE
                        && m.getDateDebut().isBefore(fin)
                        && m.getDateFin().isAfter(debut));
        if (conflict) {
            throw new IllegalStateException("Ce terrain est déjà réservé pour cette plage horaire");
        }
    }

    private void validerTransitionStatut(MatchStatus actuel, MatchStatus nouveau) {
        Map<MatchStatus, Set<MatchStatus>> transitions = new EnumMap<>(MatchStatus.class);
        transitions.put(MatchStatus.PLANIFIE, Set.of(MatchStatus.EN_COURS, MatchStatus.ANNULE, MatchStatus.REPORTE));
        transitions.put(MatchStatus.EN_COURS, Set.of(MatchStatus.TERMINE, MatchStatus.ANNULE));
        transitions.put(MatchStatus.REPORTE, Set.of(MatchStatus.PLANIFIE, MatchStatus.ANNULE));
        transitions.put(MatchStatus.TERMINE, Collections.emptySet());
        transitions.put(MatchStatus.ANNULE, Collections.emptySet());

        Set<MatchStatus> allowed = transitions.getOrDefault(actuel, Collections.emptySet());
        if (!allowed.contains(nouveau)) {
            throw new IllegalArgumentException(
                    String.format("Transition de statut invalide: %s → %s", actuel, nouveau));
        }
    }

    private void publierEvenement(String routingKey, Object payload) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, routingKey, payload);
        } catch (Exception e) {
            log.warn("Impossible de publier l'événement RabbitMQ {}: {}", routingKey, e.getMessage());
        }
    }

    private MatchDTO toDTO(Match m) {
        return MatchDTO.builder()
                .id(m.getId())
                .titre(m.getTitre())
                .equipe1(m.getEquipe1())
                .equipe2(m.getEquipe2())
                .scoreEquipe1(m.getScoreEquipe1())
                .scoreEquipe2(m.getScoreEquipe2())
                .dateDebut(m.getDateDebut())
                .dateFin(m.getDateFin())
                .statut(m.getStatut())
                .type(m.getType())
                .arbitre(m.getArbitre())
                .description(m.getDescription())
                .capaciteSpectateurs(m.getCapaciteSpectateurs())
                .terrainId(m.getTerrainId())
                .evenements(m.getEvenements().stream().map(this::toEventDTO).collect(Collectors.toList()))
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .build();
    }

    private MatchEventDTO toEventDTO(MatchEvent e) {
        return MatchEventDTO.builder()
                .id(e.getId())
                .type(e.getType())
                .minute(e.getMinute())
                .joueur(e.getJoueur())
                .equipe(e.getEquipe())
                .description(e.getDescription())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
