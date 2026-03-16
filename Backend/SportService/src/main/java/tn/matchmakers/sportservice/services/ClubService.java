package tn.matchmakers.sportservice.services;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import tn.matchmakers.sportservice.dto.ClubCreateDto;
import tn.matchmakers.sportservice.dto.ClubResponseDto;
import tn.matchmakers.sportservice.dto.external.TeamDto;
import tn.matchmakers.sportservice.entities.Club;
import tn.matchmakers.sportservice.entities.UserRef;
import tn.matchmakers.sportservice.exceptions.ForbiddenException;
import tn.matchmakers.sportservice.exceptions.UnauthorizedException;
import tn.matchmakers.sportservice.repositories.ClubRepository;
import tn.matchmakers.sportservice.services.clients.TeamServiceClient;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClubService {
    private final ClubRepository clubRepository;
    private final TeamServiceClient teamServiceClient;
    private final RestTemplate restTemplate;

    private final String uploadDir = "uploads/clubs/logos";
    private final String userServiceUrl = "http://localhost:8081/users/auth/validate-token";

    // ─── CRUD
    public ClubResponseDto createClub(ClubCreateDto dto, String token) {
        // 1️⃣ Appel à UserService pour vérifier le token
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response;
        try {
            response = restTemplate.exchange(
                    userServiceUrl,
                    HttpMethod.GET,
                    entity,
                    Map.class
            );
        } catch (HttpClientErrorException e) {
            throw new UnauthorizedException("Token invalide ou expiré");
        }

        Map<String, Object> userInfo = response.getBody();
        if (userInfo == null) throw new UnauthorizedException("Token invalide");

        String role = String.valueOf(userInfo.get("role"));
        if (!"ADMIN".equals(role) && !"RESPONSABLE".equals(role)) {
            throw new ForbiddenException("Seuls les Admins ou Responsables peuvent créer un club");
        }

        String userId = String.valueOf(userInfo.get("id"));
        String firstName = String.valueOf(userInfo.get("firstName"));
        String lastName = String.valueOf(userInfo.get("lastName"));

        // 2️⃣ Créer Club
        Club club = new Club();
        club.setNameClub(dto.getNameClub());
        club.setCity(dto.getCity());
        club.setDescriptionClub(dto.getDescriptionClub());
        club.setLogoFileName(dto.getLogoFileName());
        club.setSport(dto.getSport());
        club.setTeamIds(dto.getTeamIds());

        // 3️⃣ Assignation createdBy
        club.setCreatedBy(new UserRef(userId, (firstName + " " + lastName).trim()));

        // 4️⃣ Assignation ownerId
        if ("RESPONSABLE".equals(role)) {
            club.setOwnerId(userId); // responsable = owner
        } else if ("ADMIN".equals(role)) {
            club.setOwnerId(dto.getOwnerId()); // ADMIN peut assigner owner
        }

        Club saved = clubRepository.save(club);
        return new ClubResponseDto(saved);
    }

    public Club getById(String id) {
        return clubRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Club non trouvé: " + id));
    }
    public List<Club> getAll() {
        return clubRepository.findAll();
    }
    public List<Club> getBySport(String sportId) {
        return clubRepository.findBySportId(sportId);
    }
    public List<Club> getByCity(String city) {
        return clubRepository.findByCity(city);
    }
    public List<Club> getByOwner(String ownerId) {
        return clubRepository.findByOwnerId(ownerId);
    }
    public Club update(String id, Club updated) {
        Club existing = getById(id);
        existing.setNameClub(updated.getNameClub());
        existing.setCity(updated.getCity());
        existing.setDescriptionClub(updated.getDescriptionClub());
        existing.setSport(updated.getSport());
        return clubRepository.save(existing);
    }
    public void delete(String id) {
        Club club = getById(id);
        if (club.getLogoFileName() != null) {
            deleteLogo(club.getLogoFileName());
        }
        clubRepository.deleteById(id);
    }

    // ─── Logo
    public Club uploadLogo(String clubId, MultipartFile file) throws IOException {
        Club club = getById(clubId);

        // Supprime l'ancien logo
        if (club.getLogoFileName() != null) {
            deleteLogo(club.getLogoFileName());
        }

        // Génère un nom unique
        String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
        String fileName = UUID.randomUUID().toString() + "." + extension;

        // Crée le dossier si nécessaire
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Sauvegarde le fichier
        Files.copy(file.getInputStream(), uploadPath.resolve(fileName),
                StandardCopyOption.REPLACE_EXISTING);

        club.setLogoFileName(fileName);
        return clubRepository.save(club);
    }
    public Path getLogoPath(String fileName) {
        return Paths.get(uploadDir).resolve(fileName);
    }
    private void deleteLogo(String fileName) {
        try {
            Files.deleteIfExists(Paths.get(uploadDir).resolve(fileName));
        } catch (IOException ignored) {}
    }
    // ─── Teams (8085)

    public Club addTeam(String clubId, String teamId) {
        Club club = getById(clubId);
        if (!club.getTeamIds().contains(teamId)) {
            club.getTeamIds().add(teamId);
            clubRepository.save(club);
        }
        return club;
    }

    public Club removeTeam(String clubId, String teamId) {
        Club club = getById(clubId);
        club.getTeamIds().remove(teamId);
        return clubRepository.save(club);
    }
    // ─── Vue enrichie ─────────────────────────────────────────────────────────

    public ClubResponseDto getClubDetail(String clubId, String baseUrl) {
        Club club = getById(clubId);

        String logoUrl = club.getLogoFileName() != null
                ? baseUrl + "/api/clubs/logo/" + club.getLogoFileName()
                : null;

        List<TeamDto> teams = teamServiceClient.getTeamsByIds(club.getTeamIds());

        return ClubResponseDto.builder()
                .id(club.getId())
                .nameClub(club.getNameClub())
                .city(club.getCity())
                .descriptionClub(club.getDescriptionClub())
                .logoUrl(logoUrl)
                .sport(club.getSport())
                .ownerId(club.getOwnerId())
                .teams(teams)
                .build();
    }

}