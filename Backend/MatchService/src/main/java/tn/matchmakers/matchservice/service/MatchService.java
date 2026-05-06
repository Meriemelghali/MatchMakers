package tn.matchmakers.matchservice.service;

import tn.matchmakers.matchservice.dto.*;
import tn.matchmakers.matchservice.enums.MatchStatus;
import tn.matchmakers.matchservice.enums.MatchType;

import java.time.LocalDateTime;
import java.util.List;

public interface MatchService {

    MatchDTO creerMatch(CreateMatchRequest request);

    MatchDTO obtenirMatch(String id);

    List<MatchDTO> obtenirTousLesMatchs();

    MatchDTO mettreAJourMatch(String id, CreateMatchRequest request);

    void supprimerMatch(String id);

    MatchDTO mettreAJourScore(String id, UpdateScoreRequest request);

    MatchDTO mettreAJourStatut(String id, UpdateStatusRequest request);

    List<MatchDTO> filtrerParStatut(MatchStatus statut);

    List<MatchDTO> filtrerParType(MatchType type);

    List<MatchDTO> filtrerParTerrain(String terrainId);

    List<MatchDTO> filtrerParPeriode(LocalDateTime debut, LocalDateTime fin);

    MatchDTO ajouterEvenement(String matchId, AddEventRequest request);

    List<MatchEventDTO> obtenirEvenements(String matchId);

    MatchDTO supprimerEvenement(String matchId, String eventId);
    List<MatchDTO> obtenirHistoriqueEquipes(String eq1, String eq2);
}
