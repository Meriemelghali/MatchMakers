package tn.matchmakers.reclamationservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.reclamationservice.entities.Reclamation;
import tn.matchmakers.reclamationservice.entities.Sanction;
import tn.matchmakers.reclamationservice.repositories.ReclamationRepository;
import tn.matchmakers.reclamationservice.repositories.SanctionRepository;
import tn.matchmakers.reclamationservice.services.ReclamationService;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reclamations")
@RequiredArgsConstructor
@CrossOrigin("*")
public class ReclamationController {



    private final ReclamationService reclamationService;
    private final ReclamationRepository reclamationRepository;
    private final SanctionRepository sanctionRepository;

    @PostMapping
    public ResponseEntity<Reclamation> createReclamation(@RequestBody Reclamation reclamation) {
        return new ResponseEntity<>(reclamationService.createReclamation(reclamation), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Reclamation>> getAllReclamations() {
        return ResponseEntity.ok(reclamationService.getAllReclamations());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Reclamation> getReclamationById(@PathVariable String id) {
        return ResponseEntity.ok(reclamationService.getReclamationById(id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Reclamation>> getReclamationsByUserId(@PathVariable String userId) {
        return ResponseEntity.ok(reclamationService.getReclamationsByUserId(userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Reclamation> updateReclamation(@PathVariable String id, @RequestBody Reclamation reclamation) {
        return ResponseEntity.ok(reclamationService.updateReclamation(id, reclamation));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReclamation(@PathVariable String id) {
        reclamationService.deleteReclamation(id);
        return ResponseEntity.noContent().build();
    }
    
    // --- ADMIN DASHBOARD ---
    
    @GetMapping("/admin/dashboard/urgentes")
    public ResponseEntity<List<Reclamation>> getUrgentReclamations() {
        Map<String, Integer> priority = Map.of(
            "HAUTE", 3,
            "MOYENNE", 2,
            "BASSE", 1
        );

        List<Reclamation> urgentes = reclamationRepository.findAll()
                .stream()
                .filter(r -> "HAUTE".equals(r.getUrgence()) || 
                            "MOYENNE".equals(r.getUrgence()) ||
                            "ALERTE_ADMIN".equals(r.getStatus()) || 
                            "PENDING".equals(r.getStatus()))
                .sorted((r1, r2) -> {
                    int p1 = priority.getOrDefault(r1.getUrgence(), 0);
                    int p2 = priority.getOrDefault(r2.getUrgence(), 0);
                    return Integer.compare(p2, p1); // Décroissant : 3, 2, 1
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(urgentes);
    }
    
    @GetMapping("/admin/dashboard/stats")
    public ResponseEntity<Map<String, Object>> getAIStats() {
        List<Reclamation> all = reclamationRepository.findAll();
        Map<String, Long> types = all.stream()
                .filter(r -> r.getType() != null)
                .collect(Collectors.groupingBy(Reclamation::getType, Collectors.counting()));
        
        Map<String, Long> urgences = all.stream()
                .filter(r -> r.getUrgence() != null)
                .collect(Collectors.groupingBy(Reclamation::getUrgence, Collectors.counting()));
        
        long totalSanctions = sanctionRepository.count();
        long totalAutoResolved = all.stream().filter(r -> "AUTO_RESOLVED".equals(r.getStatus())).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("byType", types);
        stats.put("byUrgence", urgences);
        stats.put("totalSanctions", totalSanctions);
        stats.put("totalAutoResolved", totalAutoResolved);
        stats.put("totalReclamations", (long) all.size());

        return ResponseEntity.ok(stats);
    }
    
    // --- SANCTIONS ---
    
    @PostMapping("/sanctions")
    public ResponseEntity<Sanction> createSanction(@RequestBody Sanction sanction) {
        reclamationService.createSanction(sanction);
        return new ResponseEntity<>(sanction, HttpStatus.CREATED);
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<Void> resolveReclamation(@PathVariable String id, @RequestParam(required = false) String adminComment) {
        reclamationService.resolveReclamation(id, adminComment);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/sanctions/user/{userId}")
    public ResponseEntity<List<Sanction>> getUserSanctions(@PathVariable String userId) {
        return ResponseEntity.ok(sanctionRepository.findByUserId(userId));
    }
}
