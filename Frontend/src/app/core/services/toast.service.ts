import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  toasts$ = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'error' | 'info' = 'success') {
    this.toastSubject.next({ message, type });
    
    // Fallback to alert if needed, but the component will handle the UI
    if (type === 'error') {
       console.error('Toast Error:', message);
    }
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }
}
