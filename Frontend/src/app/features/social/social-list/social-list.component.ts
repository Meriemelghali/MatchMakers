import { Component, OnInit } from '@angular/core';
import { SocialService, SocialPost, SocialComment, SocialReaction } from '../services/social.service';
import { UserService, UserResponse } from 'src/app/core/services/user-service/user.service';
import { forkJoin } from 'rxjs';

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
  users: UserResponse[] = [];
  loading = true;
  error = false;

  editingPostId: string | null = null;
  deletingPostId: string | null = null;
  deletingCommentId: string | null = null;
  editContent: string = '';

  newCommentContents: { [postId: string]: string } = {};
  showCommentsFor: { [postId: string]: boolean } = {};

  get postsCount(): number {
    return this.posts.length;
  }

  readonly reactionTypes: ReactionType[] = [
    { type: 'LIKE', emoji: '👍', label: "J'aime" },
    { type: 'LOVE', emoji: '❤️', label: 'Adore' },
    { type: 'HAHA', emoji: '😂', label: 'Haha' },
    { type: 'WOW', emoji: '😮', label: 'Wow' },
    { type: 'SAD', emoji: '😢', label: 'Triste' },
  ];

  /** Logged-in user id (static for demo) */
  public readonly currentUserId = localStorage.getItem('userId') || '';

  constructor(private socialService: SocialService, private userService: UserService) { }

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;
    this.error = false;

    forkJoin({
      posts: this.socialService.getPosts(),
      users: this.userService.getAllUsers()
    }).subscribe({
      next: (res) => {
        this.posts = (res.posts || []).sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        this.users = res.users;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  getUserName(idUser: string): string {
    const u = this.users.find(usr => usr.idUser === idUser);
    if (!u) return 'Inconnu';
    if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
    return u.username || 'Anonyme';
  }

  getInitials(idUser: string): string {
    const u = this.users.find(usr => usr.idUser === idUser);
    if (!u) return 'U';
    if (u.firstName && u.lastName) return (u.firstName[0] + u.lastName[0]).toUpperCase();
    return (u.username?.[0] || 'U').toUpperCase();
  }

  getCurrentUserName(): string {
    return this.getUserName(this.currentUserId);
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
    if (post.idUser !== this.currentUserId) return;
    this.socialService.updatePost(post.id, { content: this.editContent.trim(), idUser: post.idUser! }).subscribe({
      next: (updated) => {
        post.content = updated.content;
        this.cancelEdit();
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.message || "Une erreur est survenue lors de la modification. Le contenu est peut-être inapproprié.");
      }
    });
  }

  deletePost(post: SocialPost, confirm: boolean = false): void {
    if (!post.id) return;
    if (post.idUser !== this.currentUserId) return;

    if (!confirm) {
      this.deletingPostId = post.id;
      return;
    }

    this.socialService.deletePost(post.id).subscribe({
      next: () => {
        this.posts = this.posts.filter(p => p.id !== post.id);
        this.deletingPostId = null;
      },
      error: (err) => {
        console.error(err);
        this.deletingPostId = null;
      }
    });
  }

  cancelDeletePost(): void {
    this.deletingPostId = null;
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
      error: err => {
        console.error(err);
        alert(err.error?.message || "Le commentaire n'a pas pu être publié car il contient peut-être du contenu inapproprié.");
      }
    });
  }

  deleteComment(post: SocialPost, commentId: string | undefined, confirm: boolean = false): void {
    if (!commentId) return;

    // Optional: check ownership here too if the comment object was passed
    const comment = post.comments?.find(c => c.idComment === commentId);
    if (comment && comment.idUser !== this.currentUserId) return;

    if (!confirm) {
      this.deletingCommentId = commentId;
      return;
    }

    this.socialService.deleteComment(commentId).subscribe({
      next: () => {
        post.comments = post.comments?.filter(c => c.idComment !== commentId);
        this.deletingCommentId = null;
      },
      error: (err) => {
        console.error(err);
        this.deletingCommentId = null;
      }
    });
  }

  cancelDeleteComment(): void {
    this.deletingCommentId = null;
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
