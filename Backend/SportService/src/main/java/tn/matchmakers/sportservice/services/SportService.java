package tn.matchmakers.sportservice.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.sportservice.entities.Sport;
import tn.matchmakers.sportservice.repositories.SportCategoryRepository;
import tn.matchmakers.sportservice.repositories.SportRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SportService {
    private final SportRepository sportRepository;
    private final SportCategoryRepository sportCategoryRepository;

    public Sport create(Sport sport) {
        return sportRepository.save(sport);
    }
    public Sport getById(String id) {
        return sportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sport non trouvé: " + id));
    }
    public List<Sport> getAll() {
        return sportRepository.findAll();
    }

    public List<Sport> getByCategory(String categoryId) {
        return sportRepository.findBySportCategoriesId(categoryId);
    }
    public Sport update(String id, Sport updated) {

        Sport existing = getById(id);

        if(updated.getNameSport() != null){
            existing.setNameSport(updated.getNameSport());
        }

        if(updated.getMinPlayers() != null){
            existing.setMinPlayers(updated.getMinPlayers());
        }

        if(updated.getMaxPlayers() != null){
            existing.setMaxPlayers(updated.getMaxPlayers());
        }

        if(updated.getSportCategories() != null){
            existing.setSportCategories(updated.getSportCategories());
        }

        return sportRepository.save(existing);
    }
    public void delete(String id) {
        sportRepository.deleteById(id);
    }
}