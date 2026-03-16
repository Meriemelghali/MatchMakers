package tn.matchmakers.userservice.configs;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import tn.matchmakers.userservice.entities.Permission;
import tn.matchmakers.userservice.entities.Role;
import tn.matchmakers.userservice.repositories.PermissionRepository;
import tn.matchmakers.userservice.repositories.RoleRepository;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Override
    public void run(String... args) {
        seedPermissions();
        seedRoles();
    }

    private void seedPermissions() {
        List<Map<String, String>> perms = List.of(
                Map.of("name", "USER_READ",       "desc", "Voir les profils utilisateurs"),
                Map.of("name", "USER_WRITE",      "desc", "Modifier les profils utilisateurs"),
                Map.of("name", "USER_DELETE",     "desc", "Supprimer des utilisateurs"),
                Map.of("name", "EVENT_READ",      "desc", "Voir les événements"),
                Map.of("name", "EVENT_CREATE",    "desc", "Créer des événements"),
                Map.of("name", "EVENT_MANAGE",    "desc", "Gérer tous les événements"),
                Map.of("name", "SPONSOR_MANAGE",  "desc", "Gérer les sponsors"),
                Map.of("name", "ROLE_MANAGE",     "desc", "Gérer les rôles et permissions")
        );

        perms.forEach(p -> {
            if (!permissionRepository.existsByName(p.get("name"))) {
                permissionRepository.save(Permission.builder()
                        .name(p.get("name"))
                        .description(p.get("desc"))
                        .build());
                log.info("Created permission: {}", p.get("name"));
            }
        });
    }
    private void seedRoles() {
        // Récupère toutes les permissions par nom pour les assigner
        Map<String, Permission> permMap = permissionRepository.findAll()
                .stream().collect(Collectors.toMap(Permission::getName, p -> p));

        List<Map<String, Object>> roles = List.of(
                Map.of("name", "SPORTIF",   "desc", "Sportif inscrit",
                        "perms", Set.of("USER_READ", "EVENT_READ")),
                Map.of("name", "ORGANIZER", "desc", "Organisateur d'événements",
                        "perms", Set.of("USER_READ", "EVENT_READ", "EVENT_CREATE", "EVENT_MANAGE")),
                Map.of("name", "SPONSOR",   "desc", "Sponsor partenaire",
                        "perms", Set.of("USER_READ", "EVENT_READ", "SPONSOR_MANAGE")),
                Map.of("name", "ADMIN",     "desc", "Administrateur système",
                        "perms", Set.of("USER_READ", "USER_WRITE", "USER_DELETE",
                                "EVENT_READ", "EVENT_CREATE", "EVENT_MANAGE",
                                "SPONSOR_MANAGE", "ROLE_MANAGE"))
        );

        roles.forEach(r -> {
            String name = (String) r.get("name");
            if (!roleRepository.existsByName(name)) {
                @SuppressWarnings("unchecked")
                Set<String> permNames = (Set<String>) r.get("perms");
                Set<Permission> permissions = permNames.stream()
                        .map(permMap::get)
                        .filter(p -> p != null)
                        .collect(Collectors.toSet());

                roleRepository.save(Role.builder()
                        .name(name)
                        .description((String) r.get("desc"))
                        .permissions(permissions)
                        .build());
                log.info("Created role: {} with {} permissions", name, permissions.size());
            }
        });
    }
}
