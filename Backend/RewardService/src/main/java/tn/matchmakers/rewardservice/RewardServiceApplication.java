package tn.matchmakers.rewardservice;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import tn.matchmakers.rewardservice.entity.Reward;
import tn.matchmakers.rewardservice.enums.RewardType;
import tn.matchmakers.rewardservice.repository.RewardRepository;

import java.time.LocalDate;

@SpringBootApplication
public class RewardServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(RewardServiceApplication.class, args);
	}

	@Bean
	public CommandLineRunner initRewards(RewardRepository rewardRepository) {
		return args -> {
			if (rewardRepository.count() == 0) {
				Reward demoReward = Reward.builder()
					.name("Demo Reward")
					.type(RewardType.TROPHY)
					.description("Demo reward created at startup")
					.dateAwarded(LocalDate.now())
					.userId("demo-user")
					.username("Demo User")
					.teamId("demo-team")
					.teamName("Demo Team")
					.eventId("demo-event")
					.build();
				rewardRepository.save(demoReward);
			}
		};
	}
}
