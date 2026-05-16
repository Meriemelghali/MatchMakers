package tn.matchmakers.userservice.services.serviceInterfaces;

import tn.matchmakers.userservice.dto.AuthResponse;
import tn.matchmakers.userservice.dto.LoginRequest;
import tn.matchmakers.userservice.entities.DeviceInfo;
import tn.matchmakers.userservice.dto.Setup2FaRequest;
import tn.matchmakers.userservice.dto.Verify2FaRequest;

public interface AuthService {
    AuthResponse authenticate(LoginRequest request, DeviceInfo http ) ;
    AuthResponse setup2Fa(Setup2FaRequest request, DeviceInfo device);
    AuthResponse verifySetup2Fa(Verify2FaRequest request, DeviceInfo device);
    AuthResponse verify2Fa(Verify2FaRequest request, DeviceInfo device);
    void forgotPassword(String email);
    void resetPassword(String token, String newPassword);
}
