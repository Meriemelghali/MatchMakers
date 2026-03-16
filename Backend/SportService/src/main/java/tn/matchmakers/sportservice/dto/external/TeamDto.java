package tn.matchmakers.sportservice.dto.external;

import lombok.Data;

import java.util.List;

@Data
public class TeamDto {
    private String id;
    private String teamName;
    private String teamLogo;
    private List<String> memberIds;
}
