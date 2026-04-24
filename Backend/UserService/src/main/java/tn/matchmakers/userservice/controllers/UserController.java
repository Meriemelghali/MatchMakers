package tn.matchmakers.userservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.userservice.dto.UserResponseDto;
import tn.matchmakers.userservice.mapper.UserMapper;
import tn.matchmakers.userservice.services.serviceInterfaces.UserService;

import java.util.List;


@RestController
@RequestMapping("/users")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:8080"})
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    @GetMapping
    public ResponseEntity<List<UserResponseDto>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }
    @GetMapping("/{id}")
    public ResponseEntity<UserResponseDto> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(UserMapper.mapToUserResponseDto(userService.getUserById(id)));
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

    @PutMapping("/{userId}/profile")
    public ResponseEntity<UserResponseDto> updateProfile(
            @PathVariable String userId,
            @RequestBody tn.matchmakers.userservice.dto.ProfileUpdateDto profileUpdateDto) {
        return ResponseEntity.ok(userService.updateProfile(userId, profileUpdateDto));
    }

    @PutMapping("/{userId}/change-password")
    public ResponseEntity<Void> changePassword(
            @PathVariable String userId,
            @RequestBody tn.matchmakers.userservice.dto.ChangePasswordDto changePasswordDto) {
        userService.changePassword(userId, changePasswordDto);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/notify-new-event")
    public ResponseEntity<Void> notifyNewEvent(@RequestBody tn.matchmakers.userservice.dto.EventNotificationDto dto) {
        userService.notifyUsersForNewEvent(dto);
        return ResponseEntity.ok().build();
    }
}