package tn.matchmakers.userservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.userservice.entities.Role;
import tn.matchmakers.userservice.services.RoleService;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200", "http://localhost:8080"})
public class RoleController {
    private final RoleService roleService;
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Role>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Role> getRoleById(@PathVariable String id) {
        return ResponseEntity.ok(roleService.getRoleById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Role> createRole(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(roleService.createRole(body.get("name"), body.get("description")));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Role> updateRole(@PathVariable String id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(roleService.updateRole(id, body.get("name"), body.get("description")));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteRole(@PathVariable String id) {
        roleService.deleteRole(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Gestion des permissions d'un rôle
    @PostMapping("/{id}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Role> addPermissions(
            @PathVariable String id,
            @RequestBody Set<String> permissionIds) {
        return ResponseEntity.ok(roleService.addPermissionsToRole(id, permissionIds));
    }
    @DeleteMapping("/{id}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Role> removePermissions(
            @PathVariable String id,
            @RequestBody Set<String> permissionIds) {
        return ResponseEntity.ok(roleService.removePermissionsFromRole(id, permissionIds));
    }
    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Role> setPermissions(
            @PathVariable String id,
            @RequestBody Set<String> permissionIds) {
        return ResponseEntity.ok(roleService.setPermissionsForRole(id, permissionIds));
    }
}