import { Component } from '@angular/core';

import { Router } from '@angular/router';
import { SocialService, SocialPost } from '../services/social.service';

@Component({
  selector: 'app-social-form',
  templateUrl: './social-form.component.html',
  styleUrls: ['./social-form.component.css']
})
export class SocialFormComponent {
  post: SocialPost = {
    author: '',
    content: '',
    idUser: '69c00a957c847937bd945001'
  };
  loading = false;
  error = false;

  constructor(private socialService: SocialService, private router: Router) {}

  onSubmit(): void {
    if (!this.post.author || !this.post.content) return;
    this.loading = true;
    this.error = false;
    this.post.createdAt = new Date().toISOString();
    
    this.socialService.createPost(this.post).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/social']);
      },
      error: (err) => {
        console.error(err);
        this.error = true;
        this.loading = false;
      }
    });
  }
}
