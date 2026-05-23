package tn.matchmakers.eventcompetitionservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.eventcompetitionservice.dto.AISuggestionDto;
import tn.matchmakers.eventcompetitionservice.entities.EventType;
import tn.matchmakers.eventcompetitionservice.services.EventAIService;
import tn.matchmakers.eventcompetitionservice.services.EventTypeServiceImpl;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/event-types")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200"})
public class EventTypeController {
    private final EventTypeServiceImpl eventTypeService;
    private final EventAIService aiService;

    @GetMapping("/suggest")
    public ResponseEntity<AISuggestionDto> suggest(@RequestParam String sport, @RequestParam(defaultValue = "false") boolean isCompetition) {
        return ResponseEntity.ok(aiService.suggestConfiguration(sport, isCompetition));
    }

    @GetMapping("/suggest-new")
    public ResponseEntity<Map<String, Object>> suggestNew(@RequestParam String name) {
        return ResponseEntity.ok(aiService.suggestNewTypeConfig(name));
    }

    @PostMapping("/innovate")
    public ResponseEntity<Map<String, Object>> innovate(@RequestBody EventType type) {
        return ResponseEntity.ok(aiService.innovateTypeConfig(type));
    }

    @GetMapping("/suggest-names")
    public ResponseEntity<List<String>> suggestNames(@RequestParam String sport, @RequestParam String type) {
        return ResponseEntity.ok(aiService.suggestNames(sport, type));
    }

    @GetMapping("/suggest-description")
    public ResponseEntity<String> suggestDescription(@RequestParam String sport, @RequestParam String type) {
        return ResponseEntity.ok(aiService.suggestDescription(sport, type));
    }

    @GetMapping("/analyze-context")
    public ResponseEntity<tn.matchmakers.eventcompetitionservice.dto.ContextAnalysisDto> analyzeContext(
            @RequestParam String sport, @RequestParam String eventType) {
        return ResponseEntity.ok(aiService.analyzeContext(sport, eventType));
    }

    @GetMapping
    public ResponseEntity<List<EventType>> getAll() {
        return ResponseEntity.ok(eventTypeService.getAll());
    }

    @GetMapping("/competitions")
    public ResponseEntity<List<EventType>> getCompetitionTypes() {
        return ResponseEntity.ok(eventTypeService.getCompetitionTypes());
    }

    @GetMapping("/simple")
    public ResponseEntity<List<EventType>> getSimpleTypes() {
        return ResponseEntity.ok(eventTypeService.getSimpleTypes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventType> getById(@PathVariable String id) {
        return ResponseEntity.ok(eventTypeService.getById(id));
    }

    @PostMapping
    public ResponseEntity<EventType> create(@RequestBody EventType eventType) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventTypeService.create(eventType));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventType> update(@PathVariable String id, @RequestBody EventType eventType) {
        return ResponseEntity.ok(eventTypeService.update(id, eventType));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        eventTypeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}