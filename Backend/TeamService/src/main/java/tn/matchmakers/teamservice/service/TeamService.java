package tn.matchmakers.teamservice.service;

import tn.matchmakers.teamservice.dto.*;

import java.util.List;

public interface TeamService {

    TeamDto createTeam(TeamCreateRequest request);

    TeamDto updateTeam(String id, TeamUpdateRequest request);

    void deleteTeam(String id);

    TeamDto getTeam(String id);

    List<TeamDto> getTeams(String sport);

    TeamDto joinTeam(String id, String playerId, String username, String role);

    TeamDto leaveTeam(String id, String playerId);
}

