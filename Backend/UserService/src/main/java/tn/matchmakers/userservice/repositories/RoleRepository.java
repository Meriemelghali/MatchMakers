package tn.matchmakers.userservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.userservice.entities.Role;

import java.util.Optional;

public interface RoleRepository extends MongoRepository<Role, String> {
    Optional<Role> findByName(String name);

    boolean existsByName(String name);
}
