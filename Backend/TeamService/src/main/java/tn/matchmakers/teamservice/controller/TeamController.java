package tn.matchmakers.teamservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.teamservice.dto.*;
import tn.matchmakers.teamservice.service.TeamService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200", "http://localhost:8080"})
public class TeamController {

    private final TeamService service;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<TeamDto>> getByUser(@PathVariable String userId) {
        return ResponseEntity.ok(service.getTeamsByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<TeamDto> create(@Valid @RequestBody TeamCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createTeam(request));
    }

    @GetMapping
    public ResponseEntity<List<TeamDto>> getAll(@RequestParam(required = false) String sport) {
        return ResponseEntity.ok(service.getTeams(sport));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeamDto> getOne(@PathVariable String id) {
        return ResponseEntity.ok(service.getTeam(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TeamDto> update(@PathVariable String id,
                                          @Valid @RequestBody TeamUpdateRequest request) {
        return ResponseEntity.ok(service.updateTeam(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.deleteTeam(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<TeamDto> join(@PathVariable String id,
                                        @RequestBody Map<String, String> payload) {
        String userId = payload.getOrDefault("userId", "mockUser");
        String username = payload.getOrDefault("username", "Mock User");
        String role = payload.getOrDefault("role", "MEMBER");
        return ResponseEntity.ok(service.joinTeam(id, userId, username, role));
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<TeamDto> leave(@PathVariable String id,
                                         @RequestBody Map<String, String> payload) {
        String userId = payload.getOrDefault("userId", "mockUser");
        return ResponseEntity.ok(service.leaveTeam(id, userId));
    }
}

