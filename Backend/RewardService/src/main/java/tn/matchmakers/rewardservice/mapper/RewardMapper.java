package tn.matchmakers.rewardservice.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import tn.matchmakers.rewardservice.dto.RewardCreateRequest;
import tn.matchmakers.rewardservice.dto.RewardDto;
import tn.matchmakers.rewardservice.entity.Reward;

import java.util.List;

@Mapper(componentModel = "spring")
public interface RewardMapper {

    // Entity (Mongo) -> DTO (JSON renvoye au frontend).
    RewardDto toDto(Reward reward);

    // Liste Entity -> Liste DTO.
    List<RewardDto> toDtoList(List<Reward> rewards);

    // Request (creation) -> Entity.
    // NB: plusieurs champs sont ignores pour empecher le client de forcer des valeurs sensibles.
    @Mapping(target = "id", ignore = true)
      @Mapping(target = "createdAt", expression = "java(java.time.LocalDateTime.now())")
      @Mapping(target = "updatedAt", expression = "java(java.time.LocalDateTime.now())")
      @Mapping(target = "status", constant = "ACTIVE")
      @Mapping(target = "revokedReason", ignore = true)

      @Mapping(target = "level", ignore = true)
      @Mapping(target = "progress", ignore = true)
      @Mapping(target = "maxProgress", ignore = true)
      @Mapping(target = "evolutive", ignore = true)
      @Mapping(target = "evolutionRules", ignore = true)
      @Mapping(target = "design", ignore = true)
    Reward fromCreate(RewardCreateRequest request);
}

