import { Component, OnInit } from '@angular/core';
import { ChatService, ChatSession } from '../../services/chat.service';
import { UtilitiesService } from '../../services/utilities.service';

@Component({
  selector: 'app-chat-sessions',
  templateUrl: './chat-sessions.component.html',
  styleUrls: ['./chat-sessions.component.scss']
})
export class ChatSessionsComponent implements OnInit {
  sessions: ChatSession[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private chatService: ChatService,
    private utils: UtilitiesService
  ) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions() {
    this.isLoading = true;
    this.error = null;

    this.chatService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load chat sessions';
        this.isLoading = false;
      }
    });
  }

  openSession(session: ChatSession) {
    this.utils.redirect_page_to(`/chat?session=${session.session_id}`);
  }

  deleteSession(session: ChatSession, event: Event) {
    event.stopPropagation();
    this.chatService.deleteSession(session.session_id).subscribe({
      next: () => {
        this.sessions = this.sessions.filter(s => s.session_id !== session.session_id);
      },
      error: (err) => {
        this.error = 'Failed to delete chat session';
        setTimeout(() => {
          this.error = null;
        }, 5000);
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
} 