package tn.matchmakers.userservice.services.serviceInterfaces;

import jakarta.servlet.http.HttpServletRequest;
import tn.matchmakers.userservice.entities.DeviceInfo;

public interface DeviceMetadataService {
    DeviceInfo extractDeviceInfo(HttpServletRequest request) ;
}
