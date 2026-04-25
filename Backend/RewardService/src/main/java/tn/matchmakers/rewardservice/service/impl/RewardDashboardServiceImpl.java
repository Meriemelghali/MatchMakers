package tn.matchmakers.rewardservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.matchmakers.rewardservice.dto.RewardDashboardDto;
import tn.matchmakers.rewardservice.dto.RewardDashboardItemDto;
import tn.matchmakers.rewardservice.entity.Reward;
import tn.matchmakers.rewardservice.enums.RewardRarity;
import tn.matchmakers.rewardservice.enums.RewardStatus;
import tn.matchmakers.rewardservice.enums.RewardType;
import tn.matchmakers.rewardservice.repository.RewardRepository;
import tn.matchmakers.rewardservice.service.RewardDashboardService;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RewardDashboardServiceImpl implements RewardDashboardService {

    private final RewardRepository repository;

    @Override
    public RewardDashboardDto getDashboard(String teamId, String q, String type, String rarity, String status) {
        List<Reward> base = (teamId != null && !teamId.isBlank())
                ? repository.findByTeamId(teamId.trim())
                : repository.findAll();

        List<Reward> filtered = applyFilters(base, q, type, rarity, status);

        RewardDashboardDto dto = new RewardDashboardDto();
        dto.setTotal(filtered.size());
        dto.setGeneratedAt(LocalDateTime.now());

        Map<String, Long> byType = filtered.stream()
                .collect(Collectors.groupingBy(r -> r.getType() != null ? r.getType().name() : "AUTRE", Collectors.counting()));
        dto.setByType(toItems(byType, 12));

        Map<String, Long> byTeam = new HashMap<>();
        for (Reward r : filtered) {
            String key = (r.getTeamName() != null && !r.getTeamName().isBlank())
                    ? r.getTeamName().trim()
                    : (r.getTeamId() != null && !r.getTeamId().isBlank() ? r.getTeamId().trim() : "Sans equipe");
            byTeam.put(key, byTeam.getOrDefault(key, 0L) + 1);
        }
        dto.setByTeam(toItemsWithOthers(byTeam, 10));

        List<Integer> points = filtered.stream()
                .map(Reward::getPoints)
                .filter(Objects::nonNull)
                .filter(p -> p >= 0)
                .toList();
        if (!points.isEmpty()) {
            dto.setAvgPoints(points.stream().mapToInt(Integer::intValue).average().orElse(0.0));
            dto.setMaxPoints(points.stream().mapToInt(Integer::intValue).max().orElse(0));
        } else {
            dto.setAvgPoints(null);
            dto.setMaxPoints(null);
        }

        return dto;
    }

    private List<Reward> applyFilters(List<Reward> base, String q, String type, String rarity, String status) {
        String query = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        RewardType typeEnum = parseEnum(type, RewardType.class);
        RewardRarity rarityEnum = parseEnum(rarity, RewardRarity.class);
        RewardStatus statusEnum = parseEnum(status, RewardStatus.class);

        List<Reward> out = new ArrayList<>();
        for (Reward r : base) {
            if (!query.isBlank()) {
                String name = safeLower(r.getName());
                String user = safeLower(r.getUsername());
                String team = safeLower(r.getTeamName());
                if (!(name.contains(query) || user.contains(query) || team.contains(query))) continue;
            }
            if (typeEnum != null && r.getType() != typeEnum) continue;
            if (rarityEnum != null && r.getRarity() != rarityEnum) continue;
            if (statusEnum != null && r.getStatus() != statusEnum) continue;
            out.add(r);
        }
        return out;
    }

    private String safeLower(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }

    private <E extends Enum<E>> E parseEnum(String raw, Class<E> clz) {
        if (raw == null) return null;
        String v = raw.trim();
        if (v.isBlank()) return null;
        try {
            return Enum.valueOf(clz, v.toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            return null;
        }
    }

    private List<RewardDashboardItemDto> toItems(Map<String, Long> map, int limit) {
        return map.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(limit)
                .map(e -> new RewardDashboardItemDto(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    private List<RewardDashboardItemDto> toItemsWithOthers(Map<String, Long> map, int top) {
        List<Map.Entry<String, Long>> sorted = map.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .toList();
        List<RewardDashboardItemDto> out = new ArrayList<>();
        long others = 0;
        for (int i = 0; i < sorted.size(); i++) {
            Map.Entry<String, Long> e = sorted.get(i);
            if (i < top) out.add(new RewardDashboardItemDto(e.getKey(), e.getValue()));
            else others += e.getValue();
        }
        if (others > 0) out.add(new RewardDashboardItemDto("Autres", others));
        return out;
    }
}

