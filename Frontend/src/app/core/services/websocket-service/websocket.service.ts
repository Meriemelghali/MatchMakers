import { Injectable } from '@angular/core';
import * as SockJS from 'sockjs-client';
import { Client, Message, Stomp } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: Client | null = null;
  private messageSubject = new Subject<any>();

  constructor() { }

  /**
   * Connect to the WebSocket endpoint
   */
  connect(): void {
    // socialServiceUrl is http://localhost:8090/social/api
    // so the websocket endpoint is at http://localhost:8090/social/ws
    const socket = new SockJS('http://localhost:8090/social/ws'); 
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = (frame) => {
      console.log('STOMP: Connected: ' + frame);
    };

    this.stompClient.onStompError = (frame) => {
      console.error('STOMP: Broker reported error: ' + frame.headers['message']);
      console.error('STOMP: Additional details: ' + frame.body);
    };

    this.stompClient.activate();
  }

  /**
   * Subscribe to a specific topic
   * @param topic The topic to subscribe to (e.g., /topic/messages/123)
   */
  subscribe(topic: string): Observable<any> {
    const subject = new Subject<any>();
    
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.subscribe(topic, (message: Message) => {
        if (message.body) {
          subject.next(JSON.parse(message.body));
        }
      });
    } else {
      // If not connected yet, periodically check and subscribe
      const checkInterval = setInterval(() => {
        if (this.stompClient && this.stompClient.connected) {
          this.stompClient.subscribe(topic, (message: Message) => {
            if (message.body) {
              subject.next(JSON.parse(message.body));
            }
          });
          clearInterval(checkInterval);
        }
      }, 1000);
    }

    return subject.asObservable();
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }
}
