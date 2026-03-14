package tn.matchmakers.eventcompetitionservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@EnableMongoAuditing
@SpringBootApplication
public class EventCompetitionServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(EventCompetitionServiceApplication.class, args);
	}

}
