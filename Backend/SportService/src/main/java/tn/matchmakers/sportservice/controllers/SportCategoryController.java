package tn.matchmakers.sportservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.sportservice.entities.SportCategory;
import tn.matchmakers.sportservice.services.SportCategoryService;

import java.util.List;

@RestController
@RequestMapping("/api/sport-categories")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200"})
public class SportCategoryController {
    private final SportCategoryService sportCategoryService;

    @GetMapping
    public ResponseEntity<List<SportCategory>> getAll() {
        return ResponseEntity.ok(sportCategoryService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SportCategory> getById(@PathVariable String id) {
        return ResponseEntity.ok(sportCategoryService.getById(id));
    }

    @PostMapping
    public ResponseEntity<SportCategory> create(@RequestBody SportCategory category) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sportCategoryService.create(category));
    }
    @PutMapping("/{id}")
    public ResponseEntity<SportCategory> update(@PathVariable String id, @RequestBody SportCategory category) {
        return ResponseEntity.ok(sportCategoryService.update(id, category));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        sportCategoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
