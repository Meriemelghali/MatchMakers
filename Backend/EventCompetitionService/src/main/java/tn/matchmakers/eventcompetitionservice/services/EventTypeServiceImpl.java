package tn.matchmakers.eventcompetitionservice.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.eventcompetitionservice.entities.EventType;
import tn.matchmakers.eventcompetitionservice.repositories.EventTypeRepository;

import java.util.List;
@Service
@RequiredArgsConstructor
public class EventTypeServiceImpl {
    private final EventTypeRepository eventTypeRepository;

    public EventType create(EventType eventType) {
        return eventTypeRepository.save(eventType);
    }

    public EventType getById(String id) {
        return eventTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("EventType non trouvé: " + id));
    }

    public List<EventType> getAll() {
        return eventTypeRepository.findAll();
    }

    // Retourne uniquement les types "compétition" (pour le formulaire Angular)
    public List<EventType> getCompetitionTypes() {
        return eventTypeRepository.findByIsCompetition(true);
    }

    // Retourne uniquement les types simples (Training, Friendly...)
    public List<EventType> getSimpleTypes() {
        return eventTypeRepository.findByIsCompetition(false);
    }

    public EventType update(String id, EventType updated) {
        EventType existing = getById(id);
        existing.setTypeName(updated.getTypeName());
        existing.setIsCompetition(updated.getIsCompetition());
        return eventTypeRepository.save(existing);
    }

    public void delete(String id) {
        eventTypeRepository.deleteById(id);
    }
}