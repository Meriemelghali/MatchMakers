package tn.matchmakers.eventcompetitionservice.services.serviceInterfaces;

import tn.matchmakers.eventcompetitionservice.dto.EventCreateDto;
import tn.matchmakers.eventcompetitionservice.dto.EventResponseDto;

public interface EventService {
    EventResponseDto createEvent (EventCreateDto eventCreateDto, String token);
}
