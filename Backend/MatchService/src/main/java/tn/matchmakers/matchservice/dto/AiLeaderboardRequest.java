package tn.matchmakers.matchservice.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Simple payload sent by the frontend leaderboard "AI" panel.
 * "context" is optional and should contain a short snapshot of the standings.
 */
public record AiLeaderboardRequest(
        @NotBlank String question,
        String context
) {
}

