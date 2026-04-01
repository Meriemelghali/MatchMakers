import { Component, OnInit } from '@angular/core';
import { SocialService, SocialConversation, SocialMessage } from '../services/social.service';

export interface MockUser {
  id: string;
  numId: number;
  name: string;
  avatar: string;
}

@Component({
  selector: 'app-social-chat',
  templateUrl: './social-chat.component.html',
  styleUrls: ['./social-chat.component.css']
})
export class SocialChatComponent implements OnInit {
  conversations: SocialConversation[] = [];
  messages: SocialMessage[] = [];
  
  loadingConversations = true;
  loadingMessages = false;

  users: MockUser[] = [
    { id: '1', numId: 1, name: 'Jean Dupont', avatar: 'JD' },
    { id: '2', numId: 2, name: 'Alice M', avatar: 'AM' },
    { id: '3', numId: 3, name: 'Sami K', avatar: 'SK' },
    { id: '4', numId: 4, name: 'Omar B', avatar: 'OB' },
    { id: '5', numId: 5, name: 'Emma T', avatar: 'ET' }
  ];

  currentUser = this.users[0];
  selectedUser: MockUser | null = null;
  activeConversation: SocialConversation | null = null;

  newMessageContent = '';

  constructor(private socialService: SocialService) {}

  ngOnInit(): void {
    this.fetchConversations();
  }

  fetchConversations(): void {
    this.loadingConversations = true;
    this.socialService.getConversations().subscribe({
      next: (convs) => {
        // Safe check for userIds before filtering
        this.conversations = convs.filter(c => c.userIds && c.userIds.includes(this.currentUser.numId));
        this.loadingConversations = false;
      },
      error: (err) => {
        console.error('Error fetching conversations:', err);
        // Fallback or empty state
        this.loadingConversations = false;
      }
    });
  }

  selectMockUser(user: MockUser): void {
    this.selectedUser = user;
    this.newMessageContent = '';
    
    const existingConv = this.conversations.find(c => 
      c.conversationT === 'PRIVATE' && 
      c.userIds && c.userIds.includes(this.currentUser.numId) && 
      c.userIds.includes(user.numId)
    );

    if (existingConv) {
      this.activeConversation = existingConv;
      this.fetchMessages(existingConv.idConversation!);
    } else {
      this.createConversation(user);
    }
  }

  selectConversation(conv: SocialConversation): void {
    this.activeConversation = conv;
    this.newMessageContent = '';
    const otherId = conv.userIds?.find(id => id !== this.currentUser.numId);
    if (otherId) {
      const u = this.users.find(u => u.numId === otherId);
      if (u) this.selectedUser = u;
    }
    if (conv.idConversation) {
      this.fetchMessages(conv.idConversation);
    }
  }

  createConversation(user: MockUser): void {
    this.socialService.createConversation({
      conversationT: 'PRIVATE',
      userIds: [this.currentUser.numId, user.numId]
    }).subscribe({
      next: (created) => {
        this.conversations.push(created);
        this.activeConversation = created;
        this.messages = [];
      },
      error: (err) => console.error('Error creating conversation', err)
    });
  }

  fetchMessages(conversationId: string): void {
    this.loadingMessages = true;
    this.socialService.getConversation(conversationId).subscribe({
      next: (conv) => {
        this.messages = conv.messages || [];
        if (this.messages.length > 0) {
            this.messages.sort((a, b) => new Date(a.send_at || 0).getTime() - new Date(b.send_at || 0).getTime());
        }
        this.loadingMessages = false;
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Error fetching messages:', err);
        this.loadingMessages = false;
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessageContent.trim() || !this.activeConversation?.idConversation) return;

    const newMsg = {
      content: this.newMessageContent.trim(),
      idConversation: this.activeConversation.idConversation,
      idUser: this.currentUser.id
    };

    this.socialService.createMessage(newMsg).subscribe({
      next: (created) => {
        this.messages.push(created);
        this.newMessageContent = '';
        this.scrollToBottom();
      },
      error: (err) => console.error('Error sending message', err)
    });
  }

  get otherUsers(): MockUser[] {
    return this.users.filter(u => u.id !== this.currentUser.id);
  }

  getUserName(idUser: string | undefined): string {
    if (!idUser) return 'Inconnu';
    const u = this.users.find(usr => usr.id === idUser);
    return u ? u.name : 'Inconnu';
  }

  getAvatar(idUser: string | undefined): string {
    if (!idUser) return '?';
    const u = this.users.find(usr => usr.id === idUser);
    return u ? u.avatar : '?';
  }

  getConversationName(conv: SocialConversation): string {
    if (!conv.userIds) return 'Conversation';
    const otherId = conv.userIds.find(id => id !== this.currentUser.numId);
    const otherUser = this.users.find(u => u.numId === otherId);
    return otherUser ? otherUser.name : 'Conversation';
  }

  getConversationAvatar(conv: SocialConversation): string {
    if (!conv.userIds) return 'C';
    const otherId = conv.userIds.find(id => id !== this.currentUser.numId);
    const otherUser = this.users.find(u => u.numId === otherId);
    return otherUser ? otherUser.avatar : 'C';
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = document.getElementById('chat-messages-container');
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 100);
  }
}
