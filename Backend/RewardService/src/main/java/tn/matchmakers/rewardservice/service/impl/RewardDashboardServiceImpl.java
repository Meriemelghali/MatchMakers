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

    /**
     * Construit un "dashboard" (stats) sur les récompenses, avec filtres optionnels.
     *
     * <p>⚠️ Important : ce dashboard est recalculé côté serveur à chaque appel, à partir de MongoDB.
     * Le front l'appelle après chaque changement de filtre (teamId / q / type / rarity / status).</p>
     *
     * @param teamId  (optionnel) si présent → on ne charge que les récompenses de cette équipe via {@code findByTeamId}.
     * @param q       (optionnel) recherche texte (name OR username OR teamName).
     * @param type    (optionnel) nom d'enum {@link RewardType} (ex: "MVP").
     * @param rarity  (optionnel) nom d'enum {@link RewardRarity} (ex: "EPIC").
     * @param status  (optionnel) nom d'enum {@link RewardStatus} (ex: "ACTIVE").
     */
    @Override
    public RewardDashboardDto getDashboard(String teamId, String q, String type, String rarity, String status) {
        // 1) Base dataset (Mongo) : soit toutes les récompenses, soit uniquement une équipe.
        List<Reward> base = (teamId != null && !teamId.isBlank())
                ? repository.findByTeamId(teamId.trim())
                : repository.findAll();

        // 2) Application des filtres (q/type/rarity/status) sur la base.
        List<Reward> filtered = applyFilters(base, q, type, rarity, status);

        // 3) Création du DTO dashboard (total + stats)
        RewardDashboardDto dto = new RewardDashboardDto();
        dto.setTotal(filtered.size());
        dto.setGeneratedAt(LocalDateTime.now());

        // 4) Agrégation par type.
        Map<String, Long> byType = filtered.stream()
                .collect(Collectors.groupingBy(r -> r.getType() != null ? r.getType().name() : "AUTRE", Collectors.counting()));
        dto.setByType(toItems(byType, 12));

        // 5) Agrégation par équipe :
        // - on préfère teamName (plus lisible dans le UI),
        // - sinon fallback teamId,
        // - sinon "Sans equipe".
        Map<String, Long> byTeam = new HashMap<>();
        for (Reward r : filtered) {
            String key = (r.getTeamName() != null && !r.getTeamName().isBlank())
                    ? r.getTeamName().trim()
                    : (r.getTeamId() != null && !r.getTeamId().isBlank() ? r.getTeamId().trim() : "Sans equipe");
            byTeam.put(key, byTeam.getOrDefault(key, 0L) + 1);
        }
        dto.setByTeam(toItemsWithOthers(byTeam, 10));

        // 6) Stats points :
        // - ignore null
        // - ignore valeurs négatives
        // - avg en Double, max en Integer
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

        // 7) Résultat final renvoyé au front.
        return dto;
    }

    /**
     * Filtre une liste en mémoire (déjà chargée depuis Mongo).
     *
     * <p>Cette méthode ne fait pas de requête DB : elle opère sur {@code base}.</p>
     *
     * <p>Recherche texte (q) : match sur name OR username OR teamName (en lower-case).</p>
     */
    private List<Reward> applyFilters(List<Reward> base, String q, String type, String rarity, String status) {
        // Normalisation du texte de recherche.
        String query = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";

        // Parsing “safe” des enums : si valeur inconnue → null (donc pas de filtre).
        RewardType typeEnum = parseEnum(type, RewardType.class);
        RewardRarity rarityEnum = parseEnum(rarity, RewardRarity.class);
        RewardStatus statusEnum = parseEnum(status, RewardStatus.class);

        // Filtrage impératif (boucle) pour garder la logique lisible et contrôlée.
        List<Reward> out = new ArrayList<>();
        for (Reward r : base) {
            // 1) Filtre recherche texte (q) : si q est vide → on skip ce filtre.
            if (!query.isBlank()) {
                String name = safeLower(r.getName());
                String user = safeLower(r.getUsername());
                String team = safeLower(r.getTeamName());
                if (!(name.contains(query) || user.contains(query) || team.contains(query))) continue;
            }

            // 2) Filtre type (si typeEnum != null).
            if (typeEnum != null && r.getType() != typeEnum) continue;

            // 3) Filtre rarity (si rarityEnum != null).
            if (rarityEnum != null && r.getRarity() != rarityEnum) continue;

            // 4) Filtre status (si statusEnum != null).
            if (statusEnum != null && r.getStatus() != statusEnum) continue;

            // Si on passe tous les filtres, on garde l'élément.
            out.add(r);
        }
        return out;
    }

    /**
     * Lower-case "safe" (null → "").
     */
    private String safeLower(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }

    /**
     * Convertit une string optionnelle en Enum.
     *
     * <p>Si la valeur est vide ou invalide → {@code null} (ce qui veut dire : ne pas filtrer).</p>
     */
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

