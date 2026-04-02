package tn.matchmakers.userservice.services.serviceInterfaces;

import tn.matchmakers.userservice.dto.AuthResponse;
import tn.matchmakers.userservice.dto.LoginRequest;
import tn.matchmakers.userservice.entities.DeviceInfo;

public interface AuthService {
    AuthResponse authenticate(LoginRequest request, DeviceInfo http ) ;
    void forgotPassword(String email);
    void resetPassword(String token, String newPassword);
}
