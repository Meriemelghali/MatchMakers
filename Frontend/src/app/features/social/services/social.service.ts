import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SocialComment {
  idComment?: string;
  content: string;
  idPost: string;
  idUser: string;
  postCreated_at?: string;
  isDeleted?: boolean;
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
  author?: string;       // display name (optional, not from backend)
  content: string;
  createdAt?: string;    // mapped from postCreated_at
  idUser: string;
  isDeleted?: boolean;
  comments?: SocialComment[];   // mapped from commentaires
  reactions?: SocialReaction[];
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
  private baseApiUrl = 'http://localhost:8090/social/api';
  private postsUrl = this.baseApiUrl + '/posts';
  private commentsUrl = this.baseApiUrl + '/commentaires';
  private reactionsUrl = this.baseApiUrl + '/reactions';

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
}
