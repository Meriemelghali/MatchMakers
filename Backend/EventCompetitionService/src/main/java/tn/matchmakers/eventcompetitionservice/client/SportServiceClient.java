package tn.matchmakers.eventcompetitionservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import tn.matchmakers.eventcompetitionservice.dto.external.SportDto;

@FeignClient(name = "sport-service", url = "${sport.service.url}")
public interface SportServiceClient {
    @GetMapping("/sports/api/sports/{id}")
    SportDto getSportById(@PathVariable("id") String id);
}
