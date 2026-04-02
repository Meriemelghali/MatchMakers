package tn.matchmakers.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    @NotBlank(message = "L'adresse e-mail est obligatoire")
    @Email(message = "Veuillez fournir une adresse e-mail valide")
    private String email;
}
