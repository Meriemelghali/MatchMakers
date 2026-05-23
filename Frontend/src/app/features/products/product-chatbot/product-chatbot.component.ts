import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProductService } from '../services/product.service';
import { Product } from '../models/product.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ChatMessage {
  role:    'user' | 'bot';
  text:    string;
  loading?: boolean;
}

@Component({
  selector: 'app-product-chatbot',
  templateUrl: './product-chatbot.component.html',
  styleUrls: ['./product-chatbot.component.css']
})
export class ProductChatbotComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isOpen    = false;
  question  = '';
  messages: ChatMessage[] = [];
  products: Product[] = [];
  loading   = false;

  private aiUrl = 'http://127.0.0.1:8001/products-chat';

  constructor(
    private http: HttpClient,
    private productService: ProductService
  ) {}

  ngOnInit() {
    // Charger les produits pour le contexte IA
    this.productService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (p) => { this.products = p; },
        error: () => {}
      });

    // Message de bienvenue
    this.messages.push({
      role: 'bot',
      text: '👋 Bonjour ! Je suis votre assistant boutique. Comment puis-je vous aider à trouver un produit sportif ?'
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleChat() { this.isOpen = !this.isOpen; }

  // ✅ Construire le contexte produits pour l'IA
  buildProductsContext(): string {
    if (!this.products.length) return 'Aucun produit disponible.';
    return this.products.map(p =>
      `- ${p.name} | Sport: ${p.sport} | Type: ${p.type} | ` +
      `Prix: ${p.price} TND | Location: ${p.rentalPricePerHour} TND/h | ` +
      `Stock: ${p.stock} | Disponible: ${p.available ? 'Oui' : 'Non'}`
    ).join('\n');
  }

  send() {
    const q = this.question.trim();
    if (!q || this.loading) return;

    // Ajouter message user
    this.messages.push({ role: 'user', text: q });
    this.question = '';
    this.loading  = true;

    // Ajouter message bot loading
    this.messages.push({ role: 'bot', text: '', loading: true });

    this.http.post<any>(this.aiUrl, {
      question:         q,
      products_context: this.buildProductsContext()
    }).subscribe({
      next: (res) => {
        // Remplacer le message loading par la réponse
        this.messages[this.messages.length - 1] = {
          role: 'bot',
          text: res.answer
        };
        this.loading = false;
      },
      error: () => {
        this.messages[this.messages.length - 1] = {
          role: 'bot',
          text: '❌ Service IA indisponible. Vérifiez qu\'Ollama est lancé.'
        };
        this.loading = false;
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  clearChat() {
    this.messages = [{
      role: 'bot',
      text: '👋 Bonjour ! Je suis votre assistant boutique. Comment puis-je vous aider ?'
    }];
  }
}