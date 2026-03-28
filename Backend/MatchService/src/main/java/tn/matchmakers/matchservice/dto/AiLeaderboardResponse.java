package tn.matchmakers.matchservice.dto;

/**
 * Response returned by the backend AI endpoint.
 * When fromLlm=false, answer is a deterministic/fallback response.
 */
public record AiLeaderboardResponse(
        String answer,
        boolean fromLlm,
        String model
) {
}

