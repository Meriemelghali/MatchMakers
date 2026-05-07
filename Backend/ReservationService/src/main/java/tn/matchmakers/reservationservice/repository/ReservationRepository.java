package tn.matchmakers.reservationservice.repository;

import tn.matchmakers.reservationservice.entities.Reservation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReservationRepository extends MongoRepository<Reservation, String> {
    List<Reservation> findByIdUser(String idUser);
    List<Reservation> findByTerrainId(String terrainId);
}
