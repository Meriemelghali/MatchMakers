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
        List<Reclamation> urgentes = reclamationRepository.findAll()
                .stream()
                .filter(r -> "HAUTE".equals(r.getUrgence()) || 
                            "ALERTE_ADMIN".equals(r.getStatus()) || 
                            "PENDING".equals(r.getStatus()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(urgentes);
    }
    
    // --- SANCTIONS ---
    
    @GetMapping("/sanctions/user/{userId}")
    public ResponseEntity<List<Sanction>> getUserSanctions(@PathVariable String userId) {
        return ResponseEntity.ok(sanctionRepository.findByUserId(userId));
    }
}
