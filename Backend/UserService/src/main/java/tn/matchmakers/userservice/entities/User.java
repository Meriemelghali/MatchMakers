package tn.matchmakers.userservice.entities;

import lombok.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import tn.matchmakers.userservice.entities.enums.AccountStatus;
import tn.matchmakers.userservice.entities.enums.Sex;
import tn.matchmakers.userservice.entities.enums.ThemePreference;


import java.time.LocalDateTime;
import java.util.*;

@Document(collection = "users")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@NoArgsConstructor

public class User extends BaseEntity implements UserDetails {

    private String firstName;
    private String lastName;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String email;

    private String passwordHash;
    private String bio;

    @Field("phoneNumber")
    private String phoneNumber;

    private String profilePictureUrl;
    private String avatar3dUrl;
    private List<String> favoriteSports = new ArrayList<>();

    private ThemePreference theme = ThemePreference.LIGHT;

    @DBRef
    private Set<Role> roles = new HashSet<>();

    private Sex sex ;
    private AccountStatus accountStatus = AccountStatus.PENDING;
    private int failedLoginAttempts = 0;
    private LocalDateTime lockUntil;
    private LocalDateTime lastLoginAt;
    private List<DeviceInfo> trustedDevices = new ArrayList<>();
    private Integer tokenVersion = 0;

    private String resetPasswordToken;
    private LocalDateTime resetPasswordTokenExpiry;

    @Indexed
    private String classId;

    // ─── Helpers
    public void addRole(Role role) {
        this.roles.add(role);
    }

    public void removeRole(Role role) {
        this.roles.remove(role);
    }

    public boolean hasRole(String roleName) {
        return this.roles.stream().anyMatch(r -> r.getName().equals(roleName));
    }

    public boolean hasPermission(String permissionName) {
        return this.roles.stream()
                .flatMap(r -> r.getPermissions().stream())
                .anyMatch(p -> p.getName().equals(permissionName));
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<SimpleGrantedAuthority> authorities = new HashSet<>();

        // Ajoute chaque rôle avec le préfixe ROLE_ (convention Spring Security)
        roles.forEach(role ->
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getName()))
        );

        // Ajoute chaque permission directement (sans préfixe)
        roles.stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(permission -> new SimpleGrantedAuthority(permission.getName()))
                .forEach(authorities::add);

        return authorities;
    }

    @Override
    public String getPassword() {
        return passwordHash; // Return actual stored hash
    }

    @Override
    public String getUsername() {
        return username; // Use email as username
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountStatus != AccountStatus.LOCKED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return accountStatus == AccountStatus.ACTIVE || accountStatus == AccountStatus.PASSWORD_RESET_REQUIRED ;
    }

}