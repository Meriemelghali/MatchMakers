package tn.matchmakers.userservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class Setup2FaRequest {
    @NotBlank(message = "L'email est obligatoire")
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    private String password;

    @NotBlank(message = "Le type de 2FA est obligatoire (EMAIL ou AUTH_APP)")
    private String type;
}
