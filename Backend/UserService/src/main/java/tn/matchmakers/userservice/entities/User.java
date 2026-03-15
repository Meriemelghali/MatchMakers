package tn.matchmakers.userservice.entities;

import lombok.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import tn.matchmakers.userservice.entities.enums.AccountStatus;
import tn.matchmakers.userservice.entities.enums.Sex;
import tn.matchmakers.userservice.entities.enums.ThemePreference;
import tn.matchmakers.userservice.entities.enums.Role;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

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

    private ThemePreference theme = ThemePreference.LIGHT;
    private Role role = Role.SPORTIF;
    private Sex sex ;
    private AccountStatus accountStatus = AccountStatus.PENDING;
    private int failedLoginAttempts = 0;
    private LocalDateTime lockUntil;
    private LocalDateTime lastLoginAt;
    private List<DeviceInfo> trustedDevices = new ArrayList<>();
    private Integer tokenVersion = 0;

    @Indexed
    private String classId;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash; // Return actual stored hash
    }

    @Override
    public String getUsername() {
        return email; // Use email as username
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
