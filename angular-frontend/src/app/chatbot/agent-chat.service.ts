import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import CryptoJS from 'crypto-js';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentChatRequest {
  messages: AgentMessage[];
}

export interface AgentChatResponse {
  reply: string;
  action?: string;
  backendResponse?: any;
  rawModelOutput?: string;
  note?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AgentChatService {
  private static ENCRYPTION_KEY = 'dennis-encryp-key';

  constructor(private http: HttpClient) {}

  chat(request: AgentChatRequest): Observable<AgentChatResponse> {
    return this.http.post<AgentChatResponse>(
      `${environment.apiUrl}/agent/chat`,
      request,
      { headers: this.buildHeaders() }
    );
  }

  private buildHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  private getToken(): string | null {
    try {
      const encryptedValue = localStorage.getItem('token');
      if (!encryptedValue) return null;
      return CryptoJS.AES.decrypt(
        encryptedValue,
        AgentChatService.ENCRYPTION_KEY
      ).toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.warn('Unable to read auth token for agent chat', e);
      return null;
    }
  }
}

