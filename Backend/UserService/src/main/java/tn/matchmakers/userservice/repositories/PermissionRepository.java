package tn.matchmakers.userservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.userservice.entities.Permission;

import java.util.Optional;

public interface PermissionRepository extends MongoRepository<Permission, String> {
    Optional<Permission> findByName(String name);

    boolean existsByName(String name);
}
