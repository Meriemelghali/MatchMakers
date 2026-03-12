package tn.matchmakers.eventcompetitionservice.entities;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;

import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@ToString
public class BaseEntity implements Serializable {
    @Id
    @Setter(AccessLevel.PROTECTED)
    private String id;

    @CreatedDate
    @Setter(AccessLevel.PROTECTED)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Setter(AccessLevel.PROTECTED)
    private LocalDateTime updatedAt;
}
