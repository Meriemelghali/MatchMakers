package tn.matchmakers.eventcompetitionservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.eventcompetitionservice.services.EventAIService;

import tn.matchmakers.eventcompetitionservice.dto.TeamPerformanceDto;

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

    @PostMapping("/analyze-team")
    public TeamPerformanceDto analyzeTeam(@RequestBody Map<String, Object> request) {
        String teamName = (String) request.get("teamName");
        String sport = (String) request.get("sport");
        int energy = (int) request.get("energy");
        int fatigue = (int) request.get("fatigue");
        int morale = (int) request.get("morale");
        String activity = (String) request.get("recentActivity");
        
        return aiService.analyzeTeamPerformance(teamName, sport, energy, fatigue, morale, activity);
    }
}
