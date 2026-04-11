package tn.matchmakers.matchservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import tn.matchmakers.matchservice.entity.Match;
import tn.matchmakers.matchservice.enums.MatchStatus;
import tn.matchmakers.matchservice.enums.MatchType;

import java.time.LocalDateTime;
import java.util.List;

public interface MatchRepository extends MongoRepository<Match, String> {

    List<Match> findByStatut(MatchStatus statut);

    List<Match> findByType(MatchType type);

    List<Match> findByTerrainId(String terrainId);

    @Query("{'dateDebut': {$gte: ?0, $lte: ?1}}")
    List<Match> findByDateDebutBetween(LocalDateTime from, LocalDateTime to);

    @Query("{'terrainId': ?0, 'statut': {$nin: ['ANNULE', 'TERMINE']}, $or: [{'dateDebut': {$lte: ?2}, 'dateFin': {$gt: ?1}}]}")
    List<Match> findOverlappingMatches(String terrainId, LocalDateTime start, LocalDateTime end);

    @Query("{ $or: [ { 'equipe1': { $in: [?0, ?1] } }, { 'equipe2': { $in: [?0, ?1] } } ] }")
    List<Match> findByEquipe1InOrEquipe2In(String eq1, String eq2);
}
