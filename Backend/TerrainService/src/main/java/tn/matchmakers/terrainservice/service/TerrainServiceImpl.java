package tn.matchmakers.terrainservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import tn.matchmakers.terrainservice.config.RabbitMQConfig;
import tn.matchmakers.terrainservice.dto.*;
import tn.matchmakers.terrainservice.entity.Terrain;
import tn.matchmakers.terrainservice.entity.TimeSlot;
import tn.matchmakers.terrainservice.enums.SportType;
import tn.matchmakers.terrainservice.enums.TerrainStatus;
import tn.matchmakers.terrainservice.repository.ReservationRepository;
import tn.matchmakers.terrainservice.repository.TerrainRepository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TerrainServiceImpl implements TerrainService {

    private final TerrainRepository terrainRepository;
    private final ReservationRepository reservationRepository;
    private final RabbitTemplate rabbitTemplate;

    @Override
    public TerrainDTO creerTerrain(CreateTerrainRequest req) {
        Terrain terrain = Terrain.builder()
                .nom(req.getNom())
                .adresse(req.getAdresse())
                .ville(req.getVille())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .typeSport(req.getTypeSport())
                .typeSurface(req.getTypeSurface())
                .capacite(req.getCapacite())
                .description(req.getDescription())
                .contact(req.getContact())
                .prixParHeure(req.getPrixParHeure())
                .eclairage(req.isEclairage())
                .vestiaires(req.isVestiaires())
                .parking(req.isParking())
                .tribunes(req.isTribunes())
                .bar(req.isBar())
                .build();
        Terrain saved = terrainRepository.save(terrain);
        publierEvenement("terrain.created", saved);
        return toDTO(saved);
    }

    @Override
    public TerrainDTO obtenirTerrain(String id) {
        return toDTO(trouverTerrain(id));
    }

    @Override
    public List<TerrainDTO> obtenirTousLesTerrains() {
        return terrainRepository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public TerrainDTO mettreAJourTerrain(String id, CreateTerrainRequest req) {
        Terrain terrain = trouverTerrain(id);
        terrain.setNom(req.getNom());
        terrain.setAdresse(req.getAdresse());
        terrain.setVille(req.getVille());
        terrain.setLatitude(req.getLatitude());
        terrain.setLongitude(req.getLongitude());
        terrain.setTypeSport(req.getTypeSport());
        terrain.setTypeSurface(req.getTypeSurface());
        terrain.setCapacite(req.getCapacite());
        terrain.setDescription(req.getDescription());
        terrain.setContact(req.getContact());
        terrain.setPrixParHeure(req.getPrixParHeure());
        terrain.setEclairage(req.isEclairage());
        terrain.setVestiaires(req.isVestiaires());
        terrain.setParking(req.isParking());
        terrain.setTribunes(req.isTribunes());
        terrain.setBar(req.isBar());
        terrain.setUpdatedAt(LocalDateTime.now());
        Terrain saved = terrainRepository.save(terrain);
        publierEvenement("terrain.updated", saved);
        return toDTO(saved);
    }

    @Override
    public void supprimerTerrain(String id) {
        Terrain terrain = trouverTerrain(id);
        terrainRepository.delete(terrain);
        publierEvenement("terrain.deleted", terrain);
    }

    @Override
    public TerrainDTO changerStatut(String id, TerrainStatus statut) {
        Terrain terrain = trouverTerrain(id);
        terrain.setStatut(statut);
        terrain.setUpdatedAt(LocalDateTime.now());
        Terrain saved = terrainRepository.save(terrain);
        publierEvenement("terrain.status.updated", saved);
        return toDTO(saved);
    }

    @Override
    public TerrainDTO ajouterPhoto(String id, String photoFilename) {
        Terrain terrain = trouverTerrain(id);
        terrain.getPhotos().add(photoFilename);
        terrain.setUpdatedAt(LocalDateTime.now());
        return toDTO(terrainRepository.save(terrain));
    }

    @Override
    public TerrainDTO supprimerPhoto(String id, String photoFilename) {
        Terrain terrain = trouverTerrain(id);
        terrain.getPhotos().remove(photoFilename);
        terrain.setUpdatedAt(LocalDateTime.now());
        return toDTO(terrainRepository.save(terrain));
    }

    @Override
    public List<TerrainDTO> filtrerParTypeSport(SportType typeSport) {
        return terrainRepository.findByTypeSport(typeSport).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<TerrainDTO> filtrerParStatut(TerrainStatus statut) {
        return terrainRepository.findByStatut(statut).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<TerrainDTO> filtrerParVille(String ville) {
        return terrainRepository.findByVilleIgnoreCase(ville).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<TerrainDTO> trouverDisponiblesParTypeEtCreneau(SportType typeSport, LocalDateTime debut,
            LocalDateTime fin) {
        List<Terrain> terrains = terrainRepository.findByTypeSportAndStatut(typeSport, TerrainStatus.DISPONIBLE);
        return terrains.stream()
                .filter(t -> reservationRepository.findOverlappingReservations(t.getId(), debut, fin).isEmpty())
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public TerrainDTO gererCreneaux(String id, List<TimeSlotDTO> creneaux) {
        Terrain terrain = trouverTerrain(id);
        terrain.setCreneaux(creneaux.stream().map(this::toSlot).collect(Collectors.toList()));
        terrain.setUpdatedAt(LocalDateTime.now());
        return toDTO(terrainRepository.save(terrain));
    }

    private Terrain trouverTerrain(String id) {
        return terrainRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Terrain introuvable: " + id));
    }

    private void publierEvenement(String routingKey, Object payload) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, routingKey, payload);
        } catch (Exception e) {
            log.warn("Impossible de publier l'événement RabbitMQ {}: {}", routingKey, e.getMessage());
        }
    }

    private TerrainDTO toDTO(Terrain t) {
        return TerrainDTO.builder()
                .id(t.getId())
                .nom(t.getNom())
                .adresse(t.getAdresse())
                .ville(t.getVille())
                .latitude(t.getLatitude())
                .longitude(t.getLongitude())
                .typeSport(t.getTypeSport())
                .typeSurface(t.getTypeSurface())
                .statut(t.getStatut())
                .capacite(t.getCapacite())
                .description(t.getDescription())
                .contact(t.getContact())
                .prixParHeure(t.getPrixParHeure())
                .photos(t.getPhotos())
                .eclairage(t.isEclairage())
                .vestiaires(t.isVestiaires())
                .parking(t.isParking())
                .tribunes(t.isTribunes())
                .bar(t.isBar())
                .creneaux(t.getCreneaux().stream().map(this::toSlotDTO).collect(Collectors.toList()))
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }

    private TimeSlotDTO toSlotDTO(TimeSlot s) {
        return TimeSlotDTO.builder()
                .jour(s.getJour())
                .heureOuverture(s.getHeureOuverture())
                .heureFermeture(s.getHeureFermeture())
                .actif(s.isActif())
                .build();
    }

    private TimeSlot toSlot(TimeSlotDTO d) {
        return TimeSlot.builder()
                .jour(d.getJour())
                .heureOuverture(d.getHeureOuverture())
                .heureFermeture(d.getHeureFermeture())
                .actif(d.isActif())
                .build();
    }
}
