import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { AuthService } from '../../../core/services/AuthService/auth.service';

@Component({
  selector: 'app-reclamation-form',
  templateUrl: './reclamation-form.component.html',
  styleUrls: ['./reclamation-form.component.css']
})
export class ReclamationFormComponent implements OnInit {
  reclamationForm: FormGroup;
  isSubmitting = false;
  aiResponse: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private reclamationService: ReclamationService,
    private authService: AuthService
  ) {
    this.reclamationForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      targetUserId: [''], // Optional
      matchId: ['']       // Optional
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.reclamationForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.aiResponse = null;
    this.errorMessage = null;

    const currentUserId = this.authService.getUserId() || 'anonymous';
    const newReclamation: Reclamation = {
      ...this.reclamationForm.value,
      userId: currentUserId
    };

    this.reclamationService.createReclamation(newReclamation).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.aiResponse = res.aiResponse || 'Votre demande a bien été reçue.';
        this.reclamationForm.reset();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = 'Une erreur est survenue lors de l\'envoi de la réclamation.';
        console.error(err);
      }
    });
  }
}
