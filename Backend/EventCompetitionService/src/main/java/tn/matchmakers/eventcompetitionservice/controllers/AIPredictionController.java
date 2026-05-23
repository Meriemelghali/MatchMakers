package tn.matchmakers.eventcompetitionservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.eventcompetitionservice.services.EventAIService;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin("*")
public class AIPredictionController {

    private final EventAIService aiService;

    @PostMapping("/predict-match")
    public Map<String, Object> predictMatch(@RequestBody Map<String, Object> request) {
        return aiService.predictMatchOutcome(request);
    }

    @PostMapping("/predict-event")
    public Map<String, Object> predictEvent(@RequestBody Map<String, Object> request) {
        return aiService.predictEventOutcome(request);
    }
}
