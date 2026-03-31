import { Component, OnInit } from '@angular/core';
import { SocialService, SocialPost, SocialComment, SocialReaction } from '../services/social.service';

export interface ReactionType {
  type: string;
  emoji: string;
  label: string;
}

@Component({
  selector: 'app-social-list',
  templateUrl: './social-list.component.html',
  styleUrls: ['./social-list.component.css']
})
export class SocialListComponent implements OnInit {
  posts: SocialPost[] = [];
  loading = true;
  error = false;

  editingPostId: string | null = null;
  editContent: string = '';

  newCommentContents: { [postId: string]: string } = {};
  showCommentsFor: { [postId: string]: boolean } = {};

  get postsCount(): number {
    return this.posts.length;
  }

  readonly reactionTypes: ReactionType[] = [
    { type: 'LIKE',  emoji: '👍', label: "J'aime"   },
    { type: 'LOVE',  emoji: '❤️', label: 'Adore'    },
    { type: 'HAHA',  emoji: '😂', label: 'Haha'     },
    { type: 'WOW',   emoji: '😮', label: 'Wow'      },
    { type: 'SAD',   emoji: '😢', label: 'Triste'   },
  ];

  /** Logged-in user id (placeholder) */
  private readonly currentUserId = '69c00a957c847937bd945001';

  constructor(private socialService: SocialService) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;
    this.error = false;

    this.socialService.getPosts().subscribe({
      next: (posts) => {
        this.posts = posts;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  // ─── EDIT / DELETE POST ────────────────────────────────────────────────────

  startEdit(post: SocialPost): void {
    if (!post.id) return;
    this.editingPostId = post.id;
    this.editContent = post.content;
  }

  cancelEdit(): void {
    this.editingPostId = null;
    this.editContent = '';
  }

  saveEdit(post: SocialPost): void {
    if (!post.id || !this.editContent.trim()) return;
    this.socialService.updatePost(post.id, { content: this.editContent.trim(), idUser: post.idUser! }).subscribe({
      next: (updated) => {
        post.content = updated.content;
        this.cancelEdit();
      },
      error: (err) => console.error(err)
    });
  }

  deletePost(id?: string): void {
    if (!id || !confirm('Êtes-vous sûr de vouloir supprimer ce post ?')) return;
    this.socialService.deletePost(id).subscribe({
      next: () => this.posts = this.posts.filter(p => p.id !== id),
      error: (err) => console.error(err)
    });
  }

  // ─── COMMENTS ─────────────────────────────────────────────────────────────

  toggleComments(postId?: string): void {
    if (!postId) return;
    this.showCommentsFor[postId] = !this.showCommentsFor[postId];
  }

  addComment(post: SocialPost): void {
    if (!post.id) return;
    const content = (this.newCommentContents[post.id] || '').trim();
    if (!content) return;

    const newComment: SocialComment = {
      content,
      idPost: post.id,
      idUser: this.currentUserId
    };

    this.socialService.createComment(newComment).subscribe({
      next: (created) => {
        if (!post.comments) post.comments = [];
        post.comments.push(created);
        this.newCommentContents[post.id!] = '';
      },
      error: err => console.error(err)
    });
  }

  deleteComment(post: SocialPost, commentId?: string): void {
    if (!commentId || !confirm('Supprimer ce commentaire ?')) return;
    this.socialService.deleteComment(commentId).subscribe({
      next: () => {
        post.comments = post.comments?.filter(c => c.idComment !== commentId);
      },
      error: err => console.error(err)
    });
  }

  // ─── REACTIONS ────────────────────────────────────────────────────────────

  toggleReaction(post: SocialPost, type: string): void {
    if (!post.id) return;
    const existing = post.reactions?.find(r => r.idUser === this.currentUserId && r.content === type);

    if (existing?.idReaction) {
      this.socialService.deleteReaction(existing.idReaction).subscribe({
        next: () => {
          post.reactions = post.reactions?.filter(r => r.idReaction !== existing.idReaction);
        },
        error: err => console.error(err)
      });
    } else {
      const newReaction: SocialReaction = { content: type, idPost: post.id!, idUser: this.currentUserId };
      this.socialService.createReaction(newReaction).subscribe({
        next: (created) => {
          if (!post.reactions) post.reactions = [];
          post.reactions.push(created);
        },
        error: err => console.error(err)
      });
    }
  }

  getReactionCount(post: SocialPost, type: string): number {
    return post.reactions?.filter(r => r.content === type).length || 0;
  }

  hasReacted(post: SocialPost, type: string): boolean {
    return !!post.reactions?.find(r => r.idUser === this.currentUserId && r.content === type);
  }

  totalReactions(post: SocialPost): number {
    return post.reactions?.length || 0;
  }
}
