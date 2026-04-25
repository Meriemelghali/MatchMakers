package tn.matchmakers.rewardservice.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class RewardProgressRequest {
    @Min(0)
    private Integer delta = 0;
    private String reason;
    private Boolean autoEvolve = true;
}

