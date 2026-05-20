import { Component, OnInit, OnDestroy } from '@angular/core';
import { SocialService, SocialConversation, SocialMessage } from '../services/social.service';
import { UserService, UserResponse } from 'src/app/core/services/user-service/user.service';
import { WebSocketService } from 'src/app/core/services/websocket-service/websocket.service';
import { Subscription } from 'rxjs';

// Extend the Window interface to include puter
declare global {
  interface Window {
    puter: any;
  }
}

@Component({
  selector: 'app-social-chat',
  templateUrl: './social-chat.component.html',
  styleUrls: ['./social-chat.component.css']
})
export class SocialChatComponent implements OnInit, OnDestroy {
  conversations: SocialConversation[] = [];
  messages: SocialMessage[] = [];

  loadingConversations = true;
  loadingMessages = false;
  loadingUsers = true;

  users: UserResponse[] = [];

  currentUser: UserResponse | null = null;
  selectedUser: UserResponse | null = null;
  activeConversation: SocialConversation | null = null;

  newMessageContent = '';
  messageToDeleteId: string | null = null;
  conversationToDeleteId: string | null = null;

  // Speech-to-text state
  isRecording = false;
  isTranscribing = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private puterScriptLoaded = false;
  private messageSubscription: Subscription | null = null;
  private conversationSub: Subscription | null = null;
  private conversationDeleteSub: Subscription | null = null;
  private messageDeleteSub: Subscription | null = null;

  private readonly currentUserId = localStorage.getItem('userId') || '';

  constructor(
    private socialService: SocialService,
    private userService: UserService,
    private webSocketService: WebSocketService
  ) { }

  ngOnInit(): void {
    this.fetchUsers();
    this.loadPuterScript();
    this.webSocketService.connect();
    this.subscribeToGlobalTopics();
  }

  ngOnDestroy(): void {
    if (this.isRecording) {
      this.stopRecording();
    }
    this.webSocketService.disconnect();
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.conversationSub) this.conversationSub.unsubscribe();
    if (this.conversationDeleteSub) this.conversationDeleteSub.unsubscribe();
    if (this.messageDeleteSub) this.messageDeleteSub.unsubscribe();
  }

  // ── Puter.js Speech-to-Text ────────────────────────────────────────────────

  /** Dynamically load the Puter.js script once */
  private loadPuterScript(): void {
    if (document.getElementById('puter-script') || window.puter) {
      this.puterScriptLoaded = true;
      return;
    }
    const script = document.createElement('script');
    script.id = 'puter-script';
    script.src = 'https://js.puter.com/v2/';
    script.onload = () => { this.puterScriptLoaded = true; };
    script.onerror = () => console.error('SocialChatComponent: Failed to load Puter.js');
    document.head.appendChild(script);
  }

  /** Toggle microphone recording on/off */
  async toggleRecording(): Promise<void> {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  /** Start capturing audio from the microphone */
  private async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];

      // Determine the best supported mime type
      const mimeType = this.getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        // Release microphone tracks
        stream.getTracks().forEach(track => track.stop());
        this.transcribeAudio();
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (err) {
      console.error('SocialChatComponent: Microphone access denied or unavailable', err);
      alert('Impossible d\'accéder au microphone. Veuillez vérifier les permissions de votre navigateur.');
    }
  }

  /** Stop the current recording */
  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    // Ensure the transcription UI state starts immediately
    this.isTranscribing = true;
  }

  /** Send recorded audio to Puter.js speech2txt and append the transcription */
  private async transcribeAudio(): Promise<void> {
    if (this.audioChunks.length === 0) {
      this.isTranscribing = false;
      return;
    }

    if (!window.puter) {
      console.error('SocialChatComponent: puter.js is not loaded yet.');
      alert('Le service de reconnaissance vocale n\'est pas encore prêt. Réessayez dans quelques secondes.');
      this.isTranscribing = false;
      return;
    }

    this.isTranscribing = true;

    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      
      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
      const supportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
      console.log('--- Transcription Debug ---');
      console.log('Used MimeType for Blob:', 'audio/webm');
      console.log('Recorder actual MimeType:', mimeType);
      console.log('Is type in supported list?', supportedFormats.some(f => mimeType.includes(f)));
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      console.log('---------------------------');
      
      if (audioBlob.size < 500) { 
        console.warn('SocialChatComponent: Audio recording too small.');
        this.isTranscribing = false;
        return;
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      // HACK: Sometimes backends are picky about extensions. We'll try naming it .mp3 
      // even if it's webm data, as a hint for some proxies.
      const tempFileName = `audio_record_${Date.now()}.mp3`;

      try {
        console.log(`SocialChatComponent: Writing binary data to Puter FS: ${tempFileName}`);
        const puterFile = await window.puter.fs.write(tempFileName, arrayBuffer);
        
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('SocialChatComponent: Starting transcription with Puter...');
        // Try passing the file object directly again but with the new extension hint
        const result = await window.puter.ai.speech2txt(puterFile.path ?? puterFile, {
          model: 'whisper-1'
        });

        await window.puter.fs.delete(tempFileName);

        const transcribedText = result?.text ?? (typeof result === 'string' ? result : '');
        if (transcribedText) {
          this.newMessageContent = this.newMessageContent
            ? `${this.newMessageContent} ${transcribedText}`
            : transcribedText;
        }
      } catch (innerErr: any) {
        console.error('SocialChatComponent: Puter FS transcription error', innerErr);
        if (innerErr.error) {
          console.error('SocialChatComponent: Detailed inner error:', JSON.stringify(innerErr.error, null, 2));
        }
        
        try { await window.puter.fs.delete(tempFileName); } catch (e) { }

        // Fallback using the blob but with a clean File wrapper 
        console.log('SocialChatComponent: Attempting fallback with File wrapper...');
        const audioFile = new File(this.audioChunks, 'recording.mp3', { type: 'audio/mpeg' });
        const result = await window.puter.ai.speech2txt(audioFile, { model: 'whisper-1' });
        const text = result?.text ?? (typeof result === 'string' ? result : '');
        if (text) {
          this.newMessageContent = this.newMessageContent ? `${this.newMessageContent} ${text}` : text;
        }
      }
    } catch (err: any) {
      console.error('SocialChatComponent: Speech-to-text error', err);
      if (!err?.message?.includes('Invalid file format')) {
        alert('Une erreur est survenue lors de la transcription. Veuillez réessayer.');
      }
    } finally {
      this.isTranscribing = false;
      this.audioChunks = [];
      // Auto-focus the textarea after transcription finishes
      setTimeout(() => {
        const textarea = document.querySelector('.field-input.auto-grow') as HTMLTextAreaElement;
        if (textarea) textarea.focus();
      }, 100);
    }
  }

  /** Helper to find a mime type supported by the current browser */
  private getSupportedMimeType(): string {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  private subscribeToGlobalTopics(): void {
    const userId = this.currentUserId;
    if (!userId) return;

    // Listen for NEW conversations
    this.conversationSub = this.webSocketService.subscribe(`/topic/user/${userId}/conversations`).subscribe({
      next: (conv: SocialConversation) => {
        console.log('WS: Received NEW conversation:', conv);
        if (!this.conversations.some(c => c.idConversation === conv.idConversation)) {
          this.conversations.unshift(conv);
        }
      }
    });

    // Listen for DELETED conversations
    this.conversationDeleteSub = this.webSocketService.subscribe(`/topic/user/${userId}/conversations/delete`).subscribe({
      next: (event: any) => {
        const convId = event.idConversation;
        console.log('WS: Received DELETE conversation event:', event, 'Target ID:', convId);
        this.conversations = this.conversations.filter(c => c.idConversation !== convId);
        if (this.activeConversation?.idConversation === convId) {
          console.log('WS: Closing active conversation due to deletion');
          this.activeConversation = null;
          this.selectedUser = null;
          this.messages = [];
        }
      }
    });
  }

  // ── Existing Methods ───────────────────────────────────────────────────────

  fetchUsers(): void {
    this.loadingUsers = true;
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        //console.log('SocialChatComponent: Mapped users received:', users);
        this.users = users;

        const identifiedUser = users.find(u => String(u.idUser) === String(this.currentUserId));

        if (identifiedUser) {
          this.currentUser = identifiedUser;
          //console.log('SocialChatComponent: Current user identified:', this.currentUser.idUser);
        } else {
          //console.warn('SocialChatComponent: Could not find logged-in user in the users list. Falling back to first user.', this.currentUserId);
          this.currentUser = users[0] ?? null;
        }

        //console.log('SocialChatComponent: Current user set to:', this.currentUser?.idUser);
        this.loadingUsers = false;
        this.fetchConversations();
      },
      error: (err) => {
        //console.error('SocialChatComponent: Error fetching users:', err);
        this.loadingUsers = false;
      }
    });
  }

  fetchConversations(): void {
    if (!this.currentUser) return;
    this.loadingConversations = true;

    this.socialService.getPosts().subscribe();

    this.socialService.getConversations().subscribe({
      next: (allConvs) => {
        //console.log('SocialChatComponent: Total conversations from server:', allConvs.length);
        this.conversations = (allConvs || []).filter(c =>
          c.userIds?.some(id => String(id) === String(this.currentUser!.idUser))
        );
        //console.log('SocialChatComponent: Filtered conversations for user:', this.conversations.length);
        this.loadingConversations = false;
      },
      error: (err) => {
        //console.error('Error fetching conversations:', err);
        this.loadingConversations = false;
      }
    });
  }

  selectUser(user: UserResponse): void {
    this.selectedUser = user;
    this.newMessageContent = '';

    const existingConv = this.conversations.find(c =>
      c.conversationT === 'PRIVATE' &&
      c.userIds &&
      c.userIds.some(id => String(id) === String(this.currentUser!.idUser)) &&
      c.userIds.some(id => String(id) === String(user.idUser))
    );

    if (existingConv) {
      this.selectConversation(existingConv);
    } else {
      this.createConversation(user);
    }
  }

  selectConversation(conv: SocialConversation): void {
    this.activeConversation = conv;
    this.newMessageContent = '';
    const otherId = conv.userIds?.find(id => String(id) !== String(this.currentUser?.idUser));
    if (otherId) {
      const u = this.users.find(u => String(u.idUser) === String(otherId));
      if (u) this.selectedUser = u;
    }
    if (conv.idConversation) {
      this.fetchMessages(conv.idConversation);
      this.subscribeToConversation(conv.idConversation);
    }
  }

  private subscribeToConversation(id: string): void {
    if (this.messageSubscription) this.messageSubscription.unsubscribe();
    if (this.messageDeleteSub) this.messageDeleteSub.unsubscribe();
    
    // Listen for NEW messages
    this.messageSubscription = this.webSocketService.subscribe(`/topic/messages/${id}`).subscribe({
      next: (msg: SocialMessage) => {
        console.log('WS: Received NEW message:', msg);
        if (!this.messages.some(m => m.idMessage === msg.idMessage)) {
          this.messages.push(msg);
          this.messages = [...this.messages].sort((a,b) => 
            new Date(a.send_at || 0).getTime() - new Date(b.send_at || 0).getTime()
          );
          this.scrollToBottom();
        }
      }
    });

    // Listen for DELETED messages
    this.messageDeleteSub = this.webSocketService.subscribe(`/topic/messages/${id}/delete`).subscribe({
      next: (event: any) => {
        const msgId = event.idMessage;
        console.log('WS: Received DELETE message event:', event, 'Target ID:', msgId);
        this.messages = this.messages.filter(m => m.idMessage !== msgId);
      }
    });
  }

  createConversation(user: UserResponse): void {
    if (!this.currentUser) return;
    this.socialService.createConversation({
      conversationT: 'PRIVATE',
      userIds: [this.currentUser.idUser, user.idUser]
    }).subscribe({
      next: (created) => {
        this.conversations.push(created);
        this.selectConversation(created);
      },
      error: (err) => console.error('Error creating conversation', err)
    });
  }

  fetchMessages(conversationId: string): void {
    this.loadingMessages = true;
    this.socialService.getConversation(conversationId).subscribe({
      next: (conv) => {
        this.messages = (conv.messages || []).sort((a, b) =>
          new Date(a.send_at || 0).getTime() - new Date(b.send_at || 0).getTime()
        );
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
    if (!this.newMessageContent.trim() || !this.activeConversation?.idConversation || !this.currentUser) return;

    this.socialService.createMessage({
      content: this.newMessageContent.trim(),
      idConversation: this.activeConversation.idConversation,
      idUser: this.currentUser.idUser
    }).subscribe({
      next: (created) => {
        // We don't necessarily need to push here because the WebSocket will 
        // broadcast it back to us, but doing it here makes the UI feel faster.
        // The subscribeToConversation logic handles deduplication.
        if (!this.messages.some(m => m.idMessage === created.idMessage)) {
           this.messages.push(created);
        }
        this.newMessageContent = '';
        this.scrollToBottom();
      },
      error: (err) => console.error('Error sending message', err)
    });
  }

  deleteConversation(conv: SocialConversation, event: Event, confirm: boolean = false): void {
    event.stopPropagation();
    if (!conv.idConversation) return;

    if (!conv.userIds?.some(id => String(id) === String(this.currentUserId))) return;

    if (!confirm) {
      this.conversationToDeleteId = conv.idConversation;
      return;
    }

    this.socialService.deleteConversation(conv.idConversation).subscribe({
      next: () => {
        this.conversations = this.conversations.filter(c => c.idConversation !== conv.idConversation);
        if (this.activeConversation?.idConversation === conv.idConversation) {
          this.activeConversation = null;
          this.selectedUser = null;
          this.messages = [];
        }
        this.conversationToDeleteId = null;
      },
      error: (err) => {
        console.error('Error deleting conversation', err);
        this.conversationToDeleteId = null;
      }
    });
  }

  cancelDeleteConversation(event: Event): void {
    event.stopPropagation();
    this.conversationToDeleteId = null;
  }

  deleteMessage(msg: SocialMessage, confirm: boolean = false): void {
    if (!msg.idMessage) return;

    if (!confirm) {
      this.messageToDeleteId = msg.idMessage;
      return;
    }

    this.socialService.deleteMessage(msg.idMessage).subscribe({
      next: () => {
        this.messages = this.messages.filter(m => m.idMessage !== msg.idMessage);
        this.messageToDeleteId = null;
      },
      error: (err) => {
        console.error('Error deleting message', err);
        this.messageToDeleteId = null;
      }
    });
  }

  cancelDeleteMessage(): void {
    this.messageToDeleteId = null;
  }

  get otherUsers(): UserResponse[] {
    if (!this.currentUser) return this.users;
    const filtered = this.users.filter(u => String(u.idUser) !== String(this.currentUser!.idUser));
    //console.log('otherUsers count:', filtered.length, '| currentUser id:', this.currentUser.idUser);
    return filtered;
  }

  getUserName(idUser: string | undefined): string {
    if (!idUser) return 'Inconnu';
    const u = this.users.find(usr => String(usr.idUser) === String(idUser));
    if (!u) return 'Inconnu';
    if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
    return u.username ?? u.email ?? 'Inconnu';
  }

  getAvatar(idUser: string | undefined): string {
    if (!idUser) return '?';
    const u = this.users.find(usr => String(usr.idUser) === String(idUser));
    if (!u) return '?';
    if (u.firstName && u.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    if (u.username) return u.username.slice(0, 2).toUpperCase();
    return '?';
  }

  getConversationName(conv: SocialConversation): string {
    if (!conv.userIds) return 'Conversation';
    const otherId = conv.userIds.find(id => String(id) !== String(this.currentUser?.idUser));
    return this.getUserName(otherId?.toString());
  }

  getConversationAvatar(conv: SocialConversation): string {
    if (!conv.userIds) return 'C';
    const otherId = conv.userIds.find(id => String(id) !== String(this.currentUser?.idUser));
    return this.getAvatar(otherId?.toString());
  }

  isSentByMe(msg: SocialMessage): boolean {
    return String(msg.idUser) === String(this.currentUser?.idUser);
  }

  isParticipant(conv: SocialConversation): boolean {
    return conv.userIds?.some(id => String(id) === String(this.currentUserId)) ?? false;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = document.getElementById('chat-messages-container');
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  }
}