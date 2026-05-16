package tn.matchmakers.eventcompetitionservice.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import tn.matchmakers.eventcompetitionservice.entities.EventType;
import tn.matchmakers.eventcompetitionservice.repositories.EventTypeRepository;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final EventTypeRepository eventTypeRepository;

    @Override
    public void run(String... args) {
        initializeEventTypes();
        updateMissingData();
    }

    private void initializeEventTypes() {
        if (eventTypeRepository.count() == 0) {
            // ... (keep initial creation logic)
            saveDefaultTypes();
        }
    }

    private void saveDefaultTypes() {
             EventType competition = EventType.builder()
                    .typeName("Competition")
                    .icon("🏆")
                    .description("- Pour les compétitions à bracket automatisé")
                    .isCompetition(true)
                    .requiresTeams(true)
                    .requiresMatches(true)
                    .build();

            EventType simple = EventType.builder()
                    .typeName("Simple Event")
                    .icon("🤝")
                    .description("- Pour les matchs directs entre deux équipes")
                    .isCompetition(false)
                    .requiresTeams(true)
                    .requiresMatches(true)
                    .build();

            eventTypeRepository.save(competition);
            eventTypeRepository.save(simple);
    }

    private void updateMissingData() {
        eventTypeRepository.findAll().forEach(type -> {
            boolean updated = false;
            if (type.getIcon() == null || type.getIcon().isEmpty()) {
                type.setIcon(type.getIsCompetition() != null && type.getIsCompetition() ? "🏆" : "🤝");
                updated = true;
            }
            if (type.getDescription() == null || type.getDescription().isEmpty()) {
                type.setDescription(type.getIsCompetition() != null && type.getIsCompetition() 
                    ? "- Pour les compétitions à bracket automatisé" 
                    : "- Pour les matchs directs entre deux équipes");
                updated = true;
            }
            if (updated) {
                eventTypeRepository.save(type);
            }
        });
    }
}
