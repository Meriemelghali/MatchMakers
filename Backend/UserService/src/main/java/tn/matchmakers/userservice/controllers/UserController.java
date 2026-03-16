package tn.matchmakers.userservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.userservice.dto.UserResponseDto;
import tn.matchmakers.userservice.mapper.UserMapper;
import tn.matchmakers.userservice.services.UserServiceImpl;
import tn.matchmakers.userservice.services.serviceInterfaces.UserService;

import java.util.List;


@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:8080"})
public class UserController {
    private final UserService userService;
    @GetMapping
    public ResponseEntity<List<UserResponseDto>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }
    @GetMapping("/{id}")
    public ResponseEntity<UserResponseDto> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getAllUsers()
                .stream()
                .filter(u -> u.getIdUser().equals(id))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("User not found")));
    }
    @DeleteMapping("deleteuser/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build(); // 204 No Content
    }
    @PostMapping("/{userId}/roles/{roleName}")
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDto> assignRole(
            @PathVariable String userId,
            @PathVariable String roleName) {
        return ResponseEntity.ok(userService.assignRoleToUser(userId, roleName));
    }
}