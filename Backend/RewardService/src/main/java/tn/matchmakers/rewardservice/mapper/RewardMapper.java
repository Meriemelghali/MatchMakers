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
    Reward fromCreate(RewardCreateRequest request);
}

