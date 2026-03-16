package tn.matchmakers.sportservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.sportservice.entities.Sport;
import tn.matchmakers.sportservice.services.SportService;

import java.util.List;

@RestController
@RequestMapping("/api/sports")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200"})
public class SportController {
    private final SportService sportService;
    @GetMapping
    public ResponseEntity<List<Sport>> getAll() {
        return ResponseEntity.ok(sportService.getAll());
    }
    @GetMapping("/{id}")
    public ResponseEntity<Sport> getById(@PathVariable String id) {
        return ResponseEntity.ok(sportService.getById(id));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<Sport>> getByCategory(@PathVariable String categoryId) {
        return ResponseEntity.ok(sportService.getByCategory(categoryId));
    }
    @PostMapping
    public ResponseEntity<Sport> create(@RequestBody Sport sport) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sportService.create(sport));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sport> update(@PathVariable String id, @RequestBody Sport sport) {
        return ResponseEntity.ok(sportService.update(id, sport));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        sportService.delete(id);
        return ResponseEntity.noContent().build();
    }
}