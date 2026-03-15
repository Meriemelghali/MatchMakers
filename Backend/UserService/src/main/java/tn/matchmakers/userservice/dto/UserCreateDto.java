package tn.matchmakers.userservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import tn.matchmakers.userservice.entities.enums.Sex;

@Data
public class UserCreateDto {
    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Username is required")
    private String username;

    @Schema(example = "example@email.com")
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @Schema(example = "string")
    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 20, message = "Password must be between 8 and 20 characters")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).*$",
            message = "Password must contain uppercase, lowercase, number and special character"
    )
    private String password;

    @NotBlank(message = "Password confirmation is required")
    private String confirmPassword;

    @Schema(example = "+216XXXXXXXX")
    @NotBlank(message = "Phone number is required")
    @Pattern(
            regexp = "^\\+216\\d{8}$",
            message = "Invalid Tunisian phone number format (example: +216XXXXXXXX)"
    )
    private String phoneNumber;

    @Schema(example = "FEMALE-MALE")
    @NotNull(message = "Sex is required")
    private Sex sex;
}
