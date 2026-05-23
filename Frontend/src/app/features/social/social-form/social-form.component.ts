import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SocialService, SocialPost } from '../services/social.service';
import { AiGenerationService } from '../services/ai-generation.service';

export interface ToxicityResult {
  is_toxic: boolean;
  scores: { [key: string]: number };
  verdict: string;
}

@Component({
  selector: 'app-social-form',
  templateUrl: './social-form.component.html',
  styleUrls: ['./social-form.component.css']
})
export class SocialFormComponent {
  post: SocialPost = {
    content: '',
    idUser: localStorage.getItem('userId') || ''
  };

  loading = false;
  aiLoading = false;
  error = false;
  errorMessage = '';
  aiPrompt = '';

  // Toxicity detection
  toxicityLoading = false;
  toxicityResult: ToxicityResult | null = null;
  isToxic = false;
  isAnalyzed = false;

  constructor(
    private socialService: SocialService,
    private aiService: AiGenerationService,
    private router: Router
  ) { }

  onSubmit(): void {
    if (!this.post.content) return;
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
        this.errorMessage = err.error?.message || err.message || 'Une erreur est survenue lors de la création de la publication.';
        this.loading = false;
      }
    });
  }

  checkToxicity(): void {
    if (!this.post.content) return;
    
    this.toxicityLoading = true;
    this.toxicityResult = null;
    this.isToxic = false;

    this.socialService.checkToxicity(this.post.content).subscribe({
      next: (res) => {
        this.toxicityResult = res;
        this.isToxic = res.is_toxic;
        this.isAnalyzed = true;
        this.toxicityLoading = false;
      },
      error: (err) => {
        console.error('Toxicity API Error:', err);
        this.toxicityLoading = false;
      }
    });
  }

  onContentChange(): void {
    this.isAnalyzed = false;
    this.isToxic = false;
    this.toxicityResult = null;
  }

  getScoreValue(value: any): number {
    return typeof value === 'number' ? value : 0;
  }

  generatePostWithAi(): void {
    if (!this.aiPrompt) return;

    this.aiLoading = true;
    this.error = false;

    this.aiService.generatePost(this.aiPrompt).subscribe({
      next: (generatedContent) => {
        this.post.content = generatedContent;
        this.onContentChange();
        this.aiLoading = false;
        // Scroll to the content textarea
        const element = document.getElementById('content');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      },
      error: (err) => {
        console.error('AI Generation Error:', err);
        this.error = true;
        this.aiLoading = false;
      }
    });
  }
}
