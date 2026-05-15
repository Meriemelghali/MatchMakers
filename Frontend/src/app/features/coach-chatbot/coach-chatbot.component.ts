import { Component, OnInit } from '@angular/core';
import { CoachService } from '../../core/services/UserService/coach.service';
import { AuthService } from '../../core/services/AuthService/auth.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-coach-chatbot',
  templateUrl: './coach-chatbot.component.html',
  styleUrls: ['./coach-chatbot.component.css']
})
export class CoachChatbotComponent implements OnInit {
  isOpen = false;
  messages: ChatMessage[] = [];
  userInput = '';
  isTyping = false;
  userId: string | null = null;

  constructor(
    private coachService: CoachService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userId = this.authService.getUserId();
    this.messages.push({
      role: 'assistant',
      text: "Bonjour ! Je suis MatchCoach, votre assistant personnel. Vous pouvez me demander de modifier votre entraînement (ex: \"remplace les squats\", \"je veux plus de cardio\", \"je n'ai pas d'haltères aujourd'hui\").",
      timestamp: new Date()
    });
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    const message = this.userInput.trim();
    if (!message || !this.userId || this.isTyping) return;

    this.messages.push({ role: 'user', text: message, timestamp: new Date() });
    this.userInput = '';
    this.isTyping = true;

    this.coachService.askCoach(this.userId, message).subscribe({
      next: (res) => {
        this.messages.push({
          role: 'assistant',
          text: res.reply || "J'ai mis à jour votre plan.",
          timestamp: new Date()
        });
        this.isTyping = false;
        // Le plan se met à jour automatiquement via le BehaviorSubject dans le service
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          text: "Désolé, une erreur est survenue. Réessayez.",
          timestamp: new Date()
        });
        this.isTyping = false;
      }
    });
  }
}