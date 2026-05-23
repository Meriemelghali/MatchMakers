package tn.matchmakers.rewardservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.rewardservice.dto.RewardDashboardDto;
import tn.matchmakers.rewardservice.service.RewardDashboardService;

@RestController
@RequestMapping("/api/rewards/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RewardDashboardController {

    // Service dashboard: calcule stats + applique filtres optionnels (q/type/rarity/status/teamId).
    private final RewardDashboardService dashboardService;

    @GetMapping
    public ResponseEntity<RewardDashboardDto> dashboard(
            @RequestParam(required = false) String teamId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String rarity,
            @RequestParam(required = false) String status
    ) {
        // Endpoint: GET /api/rewards/dashboard?... (query params optionnels)
        return ResponseEntity.ok(dashboardService.getDashboard(teamId, q, type, rarity, status));
    }
}

