import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AiGenerationService {
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private apiKey = 'YOUR_API_KEY_HERE';
  private model = 'qwen/qwen3-235b-a22b-2507';
  private preprompt = 'Tu es un expert en communication pour MatchMakers, une plateforme de sport. Ta mission est de rédiger des posts inspirants, courts et engageants pour la communauté. Voici le sujet du post : ';

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'http://localhost:4200',
      'X-OpenRouter-Title': 'MatchMakers',
      'Content-Type': 'application/json'
    };
  }

  private callApi(messages: any[]): Observable<any> {
    return from(
      fetch(this.apiUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages
        })
      }).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
    );
  }

  generatePost(userPrompt: string): Observable<string> {
    const firstMessages = [
      {
        role: 'user',
        content: `${this.preprompt} ${userPrompt}`
      }
    ];

    return this.callApi(firstMessages).pipe(
      switchMap(firstResult => {
        const assistantMessage = firstResult.choices[0].message;

        const secondMessages = [
          ...firstMessages,
          {
            role: 'assistant',
            content: assistantMessage.content
          },
          {
            role: 'user',
            content: "Peux-tu finaliser ce post pour qu'il soit parfait pour un forum de sportifs ? Donne moi uniquement le contenu du post, sans introduction ni conclusion."
          }
        ];

        return this.callApi(secondMessages);
      }),
      map(secondResult => secondResult.choices[0].message.content)
    );
  }
}