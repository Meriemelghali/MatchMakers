package tn.matchmakers.teamservice.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import tn.matchmakers.teamservice.dto.TeamCreateRequest;
import tn.matchmakers.teamservice.dto.TeamDto;
import tn.matchmakers.teamservice.entity.Team;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TeamMapper {

    TeamDto toDto(Team team);

    List<TeamDto> toDtoList(List<Team> teams);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "members", expression = "java(new java.util.ArrayList<>())")
    @Mapping(target = "createdAt", expression = "java(java.time.LocalDateTime.now())")
    Team fromCreate(TeamCreateRequest request);
}

