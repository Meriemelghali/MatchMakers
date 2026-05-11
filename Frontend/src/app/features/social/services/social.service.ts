import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface SocialComment {
  idComment?: string;
  content: string;
  idPost: string;
  idUser: string;
  postCreated_at?: string;
  isDeleted?: boolean;
}
export interface SocialUser {
  idUser: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
}
export interface SocialReaction {
  idReaction?: string;
  content: string; // reaction type: LIKE, LOVE, HAHA, WOW, SAD
  idPost: string;
  idUser: string;
  postCreated_at?: string;
}

export interface SocialPost {
  id?: string;           // mapped from idPost
  content: string;
  createdAt?: string;    // mapped from postCreated_at
  idUser: string;
  isDeleted?: boolean;
  comments?: SocialComment[];   // mapped from commentaires
  reactions?: SocialReaction[];
}

export interface SocialConversation {
  idConversation?: string;
  conversationT: 'PRIVATE' | 'TEAM' | 'EVENT' | 'COMPETITION';
  userIds: (string | number)[];
  messages?: SocialMessage[];
}

export interface SocialMessage {
  idMessage?: string;
  content: string;
  send_at?: string;
  idUser: string;
  idConversation: string;
}

/** Shape of a single page-item returned by GET /api/posts?expand=true */
interface PostApiResponse {
  idPost: string;
  content: string;
  postCreated_at: string;
  idUser: string;
  isDeleted: boolean;
  commentaires: SocialComment[];
  reactions: SocialReaction[];
}

@Injectable({
  providedIn: 'root'
})
export class SocialService {
  private usersUrl = environment.userServiceUrl + '/users';
  private baseApiUrl = environment.socialServiceUrl;
  private postsUrl = this.baseApiUrl + '/posts';
  private commentsUrl = this.baseApiUrl + '/commentaires';
  private reactionsUrl = this.baseApiUrl + '/reactions';
  private conversationsUrl = this.baseApiUrl + '/conversations';
  private messagesUrl = this.baseApiUrl + '/messages';
  private toxicityUrl = 'http://localhost:8001/analyze'; 

  constructor(private http: HttpClient) { }

  // --- POSTS ---

  /** Returns all posts with embedded commentaires + reactions (expand=true) */
  getPosts(): Observable<SocialPost[]> {
    return this.http.get<{ content: PostApiResponse[] }>(`${this.postsUrl}?expand=true&size=50`).pipe(
      map(response => (response.content || []).map(p => this.mapPost(p)))
    );
  }

  createPost(post: { content: string; idUser: string }): Observable<SocialPost> {
    return this.http.post<PostApiResponse>(this.postsUrl, post).pipe(
      map(p => this.mapPost(p))
    );
  }

  updatePost(id: string, post: { content: string; idUser: string }): Observable<SocialPost> {
    return this.http.put<PostApiResponse>(`${this.postsUrl}/${id}`, post).pipe(
      map(p => this.mapPost(p))
    );
  }

  deletePost(id: string): Observable<any> {
    return this.http.delete(`${this.postsUrl}/${id}`);
  }

  // --- COMMENTS ---

  createComment(comment: SocialComment): Observable<SocialComment> {
    return this.http.post<SocialComment>(this.commentsUrl, comment);
  }

  deleteComment(id: string): Observable<any> {
    return this.http.delete(`${this.commentsUrl}/${id}`);
  }

  // --- REACTIONS ---

  createReaction(reaction: SocialReaction): Observable<SocialReaction> {
    return this.http.post<SocialReaction>(this.reactionsUrl, reaction);
  }

  deleteReaction(id: string): Observable<any> {
    return this.http.delete(`${this.reactionsUrl}/${id}`);
  }

  // --- PRIVATE HELPERS ---

  private mapPost(p: PostApiResponse): SocialPost {
    return {
      id: p.idPost,
      content: p.content,
      createdAt: p.postCreated_at,
      idUser: p.idUser,
      isDeleted: p.isDeleted,
      comments: (p.commentaires || []).filter(c => !c.isDeleted),
      reactions: p.reactions || []
    };
  }

  // --- TOXICITY ---

  checkToxicity(text: string): Observable<any> {
    return this.http.post<any>(this.toxicityUrl, { text });
  }

  // --- CONVERSATIONS ---

  getConversations(): Observable<SocialConversation[]> {
    return this.http.get<{ content: SocialConversation[] }>(`${this.conversationsUrl}?size=500`).pipe(
      map(response => response.content || [])
    );
  }

  getConversationsByUser(userId: string): Observable<SocialConversation[]> {
    return this.http.get<{ content: SocialConversation[] }>(`${this.conversationsUrl}/user/${userId}`).pipe(
      map(response => response.content || [])
    );
  }

  getConversation(id: string): Observable<SocialConversation> {
    return this.http.get<SocialConversation>(`${this.conversationsUrl}/${id}`);
  }

  createConversation(conv: { conversationT: string, userIds: (string | number)[] }): Observable<SocialConversation> {
    return this.http.post<SocialConversation>(this.conversationsUrl, conv);
  }

  deleteConversation(id: string): Observable<any> {
    return this.http.delete(`${this.conversationsUrl}/${id}`);
  }

  // --- MESSAGES ---

  createMessage(msg: { content: string, idConversation: string, idUser: string }): Observable<SocialMessage> {
    return this.http.post<SocialMessage>(this.messagesUrl, msg);
  }

  deleteMessage(id: string): Observable<any> {
    return this.http.delete(`${this.messagesUrl}/${id}`);
  }

  // --- USERS ---

  getUsers(): Observable<SocialUser[]> {
    return this.http.get<{ content: SocialUser[] }>(this.usersUrl).pipe(
      map(response => response.content || [])
    );
  }
}
