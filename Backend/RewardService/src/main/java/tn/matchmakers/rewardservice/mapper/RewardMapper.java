package tn.matchmakers.rewardservice.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import tn.matchmakers.rewardservice.dto.RewardCreateRequest;
import tn.matchmakers.rewardservice.dto.RewardDto;
import tn.matchmakers.rewardservice.entity.Reward;

import java.util.List;

@Mapper(componentModel = "spring")
public interface RewardMapper {

    RewardDto toDto(Reward reward);

    List<RewardDto> toDtoList(List<Reward> rewards);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "revokedReason", ignore = true)
    @Mapping(target = "level", ignore = true)
    @Mapping(target = "progress", ignore = true)
    @Mapping(target = "maxProgress", ignore = true)
    @Mapping(target = "evolutive", ignore = true)
    @Mapping(target = "evolutionRules", ignore = true)
    @Mapping(target = "design", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Reward fromCreate(RewardCreateRequest request);
}

