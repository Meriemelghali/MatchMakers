package tn.matchmakers.teamservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.matchmakers.teamservice.dto.*;
import tn.matchmakers.teamservice.entity.Team;
import tn.matchmakers.teamservice.entity.TeamMember;
import tn.matchmakers.teamservice.exception.NotFoundException;
import tn.matchmakers.teamservice.mapper.TeamMapper;
import tn.matchmakers.teamservice.repository.TeamRepository;
import tn.matchmakers.teamservice.service.TeamService;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TeamServiceImpl implements TeamService {

    private final TeamRepository repository;
    private final TeamMapper mapper;

    @Override
    public TeamDto createTeam(TeamCreateRequest request) {
        Team team = mapper.fromCreate(request);
        if (team.getIsPublic() == null) {
            team.setIsPublic(Boolean.TRUE);
        }
        team.setUpdatedAt(LocalDateTime.now());
        Team saved = repository.save(team);
        return mapper.toDto(saved);
    }

    @Override
    public TeamDto updateTeam(String id, TeamUpdateRequest request) {
        Team team = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Équipe introuvable : " + id));

        if (request.getName() != null) team.setName(request.getName());
        if (request.getSport() != null) team.setSport(request.getSport());
        if (request.getDescription() != null) team.setDescription(request.getDescription());
        if (request.getLogoUrl() != null) team.setLogoUrl(request.getLogoUrl());

        if (request.getCity() != null) team.setCity(request.getCity());
        if (request.getCountry() != null) team.setCountry(request.getCountry());
        if (request.getFoundedYear() != null) team.setFoundedYear(request.getFoundedYear());
        if (request.getCoachName() != null) team.setCoachName(request.getCoachName());
        if (request.getHomeStadium() != null) team.setHomeStadium(request.getHomeStadium());
        if (request.getWebsiteUrl() != null) team.setWebsiteUrl(request.getWebsiteUrl());
        if (request.getContactEmail() != null) team.setContactEmail(request.getContactEmail());
        if (request.getContactPhone() != null) team.setContactPhone(request.getContactPhone());
        if (request.getIsPublic() != null) team.setIsPublic(request.getIsPublic());

        team.setUpdatedAt(LocalDateTime.now());

        return mapper.toDto(repository.save(team));
    }

    @Override
    public void deleteTeam(String id) {
        if (!repository.existsById(id)) {
            throw new NotFoundException("Équipe introuvable : " + id);
        }
        repository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public TeamDto getTeam(String id) {
        Team team = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Équipe introuvable : " + id));
        return mapper.toDto(team);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamDto> getTeams(String sport) {
        List<Team> teams = (sport == null || sport.isBlank())
                ? repository.findAll()
                : repository.findBySportIgnoreCase(sport);
        return mapper.toDtoList(teams);
    }

    @Override
    public TeamDto joinTeam(String id, String playerId, String username, String role) {
        Team team = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Équipe introuvable : " + id));

        boolean already = team.getMembers().stream()
                .anyMatch(m -> m.getPlayerId().equals(playerId));

        if (!already) {
            team.getMembers().add(TeamMember.builder()
                    .playerId(playerId)
                    .username(username)
                    .role(role)
                    .joinDate(LocalDateTime.now())
                    .build());
        }

        team.setUpdatedAt(LocalDateTime.now());
        return mapper.toDto(repository.save(team));
    }

    @Override
    public TeamDto leaveTeam(String id, String playerId) {
        Team team = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Équipe introuvable : " + id));

        team.getMembers().removeIf(m -> m.getPlayerId().equals(playerId));

        team.setUpdatedAt(LocalDateTime.now());
        return mapper.toDto(repository.save(team));
    }
}

