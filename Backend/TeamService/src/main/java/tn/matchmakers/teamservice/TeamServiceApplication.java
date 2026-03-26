package tn.matchmakers.teamservice;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import tn.matchmakers.teamservice.entity.Team;
import tn.matchmakers.teamservice.repository.TeamRepository;

@SpringBootApplication
public class TeamServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(TeamServiceApplication.class, args);
	}

	@Bean
	public CommandLineRunner initTeams(TeamRepository teamRepository) {
		return args -> {
			if (teamRepository.count() == 0) {
				Team demoTeam = Team.builder()
					.name("Demo Team")
					.sport("Football")
					.description("Demo team created at startup")
					.logoUrl(null)
					.ownerId("demo-owner")
					.build();
				teamRepository.save(demoTeam);
			}
		};
	}
}
