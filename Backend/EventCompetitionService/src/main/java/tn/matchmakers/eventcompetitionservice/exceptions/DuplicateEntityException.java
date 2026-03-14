package tn.matchmakers.eventcompetitionservice.exceptions;

public class DuplicateEntityException extends RuntimeException{
    public DuplicateEntityException(String message) {
        super(message);
    }
}
