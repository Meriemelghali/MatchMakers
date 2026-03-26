package tn.matchmakers.eventcompetitionservice.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.eventcompetitionservice.client.SportServiceClient;
import tn.matchmakers.eventcompetitionservice.dto.CreateEventRequest;
import tn.matchmakers.eventcompetitionservice.dto.external.SportDto;
import tn.matchmakers.eventcompetitionservice.entities.EventType;
import tn.matchmakers.eventcompetitionservice.exceptions.InvalidEventConfigException;

@Service
@RequiredArgsConstructor
public class EventValidationService {

    private final SportServiceClient sportServiceClient;
    public void validate(CreateEventRequest req, EventType eventType) {

        SportDto sport = sportServiceClient.getSportById(req.getSportId());

        boolean isCollective = sport.getSportCategories()
                .stream()
                .anyMatch(c -> c.getNameSportC().equalsIgnoreCase("collective"));

        boolean isIndividual = sport.getSportCategories()
                .stream()
                .anyMatch(c -> c.getNameSportC().equalsIgnoreCase("individual"));

        if (isCollective && !eventType.getRequiresTeams()) {
            throw new InvalidEventConfigException(
                    "Sport '" + sport.getNameSport() + "' is collective — event type must require teams."
            );
        }

        if (isIndividual && eventType.getRequiresTeams()) {
            throw new InvalidEventConfigException(
                    "Sport '" + sport.getNameSport() + "' is individual — cannot use a team-based event type."
            );
        }

        if (eventType.getIsCompetition() && req.getMaxTeam() == null) {
            throw new InvalidEventConfigException(
                    "Competition events require maxTeam to be specified."
            );
        }
    }
}