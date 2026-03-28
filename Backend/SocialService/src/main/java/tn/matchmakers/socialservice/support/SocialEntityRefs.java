package tn.matchmakers.socialservice.support;

import tn.matchmakers.socialservice.entities.Conversation;
import tn.matchmakers.socialservice.entities.Post;

/**
 * Références minimales pour {@code @DBRef} sans charger le document lié (autre microservice / autre base).
 */
public final class SocialEntityRefs {

    private SocialEntityRefs() {
    }

    public static Post postRef(String idPost) {
        Post p = new Post();
        p.setIdPost(idPost);
        return p;
    }

    public static Conversation conversationRef(String idConversation) {
        Conversation c = new Conversation();
        c.setIdConversation(idConversation);
        return c;
    }
}
