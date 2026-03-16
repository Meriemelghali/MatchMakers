package tn.matchmakers.sportservice.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.sportservice.entities.SportCategory;
import tn.matchmakers.sportservice.repositories.SportCategoryRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SportCategoryService {
    private final SportCategoryRepository sportCategoryRepository;

    public SportCategory create(SportCategory category) {
        return sportCategoryRepository.save(category);
    }
    public SportCategory getById(String id) {
        return sportCategoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SportCategory non trouvée: " + id));
    }
    public List<SportCategory> getAll() {
        return sportCategoryRepository.findAll();
    }
    public SportCategory update(String id, SportCategory updated) {
        SportCategory existing = getById(id);
        existing.setNameSportC(updated.getNameSportC());
        return sportCategoryRepository.save(existing);
    }
    public void delete(String id) {
        sportCategoryRepository.deleteById(id);
    }
}