package tn.matchmakers.eventcompetitionservice.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.eventcompetitionservice.entities.Competition;
import tn.matchmakers.eventcompetitionservice.repositories.CompetitionRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CompetitionServiceImpl {
    private final CompetitionRepository competitionRepository;

    // ─── CRUD
    public Competition create(Competition competition) {
        return competitionRepository.save(competition);
    }

    public Competition getById(String id) {
        return competitionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Competition non trouvée: " + id));
    }

    public List<Competition> getAll() {
        return competitionRepository.findAll();
    }

    public Competition update(String id, Competition updated) {
        Competition existing = getById(id);
        existing.setNameCompetition(updated.getNameCompetition());
        existing.setMaxTeam(updated.getMaxTeam());
        return competitionRepository.save(existing);
    }
    public void delete(String id) {
        competitionRepository.deleteById(id);
    }
    public Competition addTeam(String competitionId, String teamId) {
        Competition competition = getById(competitionId);
        if (!competition.getTeamIds().contains(teamId)) {
            competition.getTeamIds().add(teamId);
            competitionRepository.save(competition);
        }
        return competition;
    }

    // Ajoute un matchId (appelé après création d'un match par Ousema)
    public Competition addMatch(String competitionId, String matchId) {
        Competition competition = getById(competitionId);
        if (!competition.getMatchIds().contains(matchId)) {
            competition.getMatchIds().add(matchId);
            competitionRepository.save(competition);
        }
        return competition;
    }
}