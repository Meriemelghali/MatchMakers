import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CoachService } from '../../core/services/UserService/coach.service';
import { AuthService } from '../../core/services/AuthService/auth.service';

interface Message {
  text: string;
  sender: 'user' | 'coach';
  time: Date;
}

@Component({
  selector: 'app-ai-chatbot',
  templateUrl: './ai-chatbot.component.html',
  styleUrls: ['./ai-chatbot.component.css']
})
export class AiChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  
  isOpen = false;
  messages: Message[] = [];
  newMessage = '';
  isTyping = false;
  userId: string | null = null;

  constructor(
    private coachService: CoachService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.userId = this.authService.getUserId();
    this.messages.push({
      text: "Bonjour ! Je suis MatchCoach, votre assistant personnel. Comment puis-je vous aider aujourd'hui ?",
      sender: 'coach',
      time: new Date()
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.userId) return;

    const userMsg = this.newMessage;
    this.messages.push({
      text: userMsg,
      sender: 'user',
      time: new Date()
    });

    this.newMessage = '';
    this.isTyping = true;

    this.coachService.askCoach(this.userId, userMsg).subscribe({
      next: (res) => {
        this.messages.push({
          text: res.reply,
          sender: 'coach',
          time: new Date()
        });
        this.isTyping = false;
      },
      error: () => {
        this.isTyping = false;
      }
    });
  }

  private scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }
}
