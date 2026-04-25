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

    private final RewardDashboardService dashboardService;

    @GetMapping
    public ResponseEntity<RewardDashboardDto> dashboard(
            @RequestParam(required = false) String teamId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String rarity,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(dashboardService.getDashboard(teamId, q, type, rarity, status));
    }
}

