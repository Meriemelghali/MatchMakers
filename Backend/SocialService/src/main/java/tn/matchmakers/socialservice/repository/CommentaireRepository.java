package tn.matchmakers.socialservice.repository;

import tn.matchmakers.socialservice.entities.Commentaire;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentaireRepository extends MongoRepository<Commentaire, String> {
    Page<Commentaire> findByIsDeletedFalse(Pageable pageable);

    List<Commentaire> findByPost_IdPostAndIsDeletedFalse(String idPost);
}
