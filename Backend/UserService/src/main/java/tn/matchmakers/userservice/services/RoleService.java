package tn.matchmakers.userservice.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.userservice.entities.Permission;
import tn.matchmakers.userservice.entities.Role;
import tn.matchmakers.userservice.repositories.PermissionRepository;
import tn.matchmakers.userservice.repositories.RoleRepository;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor

public class RoleService {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    // ─── CRUD
    public Role createRole(String name, String description) {
        if (roleRepository.existsByName(name)) {
            throw new IllegalArgumentException("Role already exists: " + name);
        }
        return roleRepository.save(Role.builder()
                .name(name.toUpperCase())
                .description(description)
                .build());
    }
    public Role getRoleByName(String name) {
        return roleRepository.findByName(name)
                .orElseThrow(() -> new RuntimeException("Role not found: " + name));
    }
    public Role getRoleById(String id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found: " + id));
    }
    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }
    public Role updateRole(String id, String name, String description) {
        Role role = getRoleById(id);
        role.setName(name.toUpperCase());
        role.setDescription(description);
        return roleRepository.save(role);
    }

    public void deleteRole(String id) {
        roleRepository.deleteById(id);
    }

    // ─── Gestion des permissions
    public Role addPermissionsToRole(String roleId, Set<String> permissionIds) {
        Role role = getRoleById(roleId);
        permissionIds.forEach(permId -> {
            Permission permission = permissionRepository.findById(permId)
                    .orElseThrow(() -> new RuntimeException("Permission not found: " + permId));
            role.getPermissions().add(permission);
        });
        return roleRepository.save(role);
    }

    public Role removePermissionsFromRole(String roleId, Set<String> permissionIds) {
        Role role = getRoleById(roleId);
        role.getPermissions().removeIf(p -> permissionIds.contains(p.getId()));
        return roleRepository.save(role);
    }

    public Role setPermissionsForRole(String roleId, Set<String> permissionIds) {
        Role role = getRoleById(roleId);
        Set<Permission> permissions = new java.util.HashSet<>(permissionRepository.findAllById(permissionIds));
        role.setPermissions(permissions);
        return roleRepository.save(role);
    }
}