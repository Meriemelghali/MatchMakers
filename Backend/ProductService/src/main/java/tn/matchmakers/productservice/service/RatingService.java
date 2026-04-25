package tn.matchmakers.productservice.service;

import tn.matchmakers.productservice.dto.RatingRequestDTO;
import tn.matchmakers.productservice.dto.RatingResponseDTO;
import java.util.List;

public interface RatingService {
    RatingResponseDTO      addOrUpdateRating(RatingRequestDTO dto);
    List<RatingResponseDTO> getRatingsByProduct(String productId);
    void                   deleteRating(String id);
    double                 getAverageRating(String productId);
}