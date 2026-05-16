package tn.matchmakers.userservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tn.matchmakers.userservice.entities.User;

import java.util.Optional;
@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Optional<User> findByResetPasswordToken(String token);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmailAndIdNot(String email, String id);
    boolean existsByUsernameAndIdNot(String username, String id);

    java.util.List<User> findAllByFavoriteSportsContaining(String sportName);
}
