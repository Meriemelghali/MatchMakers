package tn.matchmakers.userservice.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.userservice.entities.Permission;
import tn.matchmakers.userservice.repositories.PermissionRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionService {
    private final PermissionRepository permissionRepository;

    public Permission createPermission(String name, String description) {
        if (permissionRepository.existsByName(name)) {
            throw new IllegalArgumentException("Permission already exists: " + name);
        }
        return permissionRepository.save(Permission.builder()
                .name(name.toUpperCase())
                .description(description)
                .build());
    }

    public Permission getPermissionById(String id) {
        return permissionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Permission not found: " + id));
    }
    public Permission getPermissionByName(String name) {
        return permissionRepository.findByName(name)
                .orElseThrow(() -> new RuntimeException("Permission not found: " + name));
    }
    public List<Permission> getAllPermissions() {
        return permissionRepository.findAll();
    }
    public Permission updatePermission(String id, String name, String description) {
        Permission permission = getPermissionById(id);
        permission.setName(name.toUpperCase());
        permission.setDescription(description);
        return permissionRepository.save(permission);
    }
    public void deletePermission(String id) {
        permissionRepository.deleteById(id);
    }
}