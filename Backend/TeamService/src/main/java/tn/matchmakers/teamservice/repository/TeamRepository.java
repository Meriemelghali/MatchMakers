package tn.matchmakers.teamservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.teamservice.entity.Team;

import java.util.List;

public interface TeamRepository extends MongoRepository<Team, String> {

    List<Team> findBySportIgnoreCase(String sport);
    List<Team> findByMembersUserId(String userId);
}

