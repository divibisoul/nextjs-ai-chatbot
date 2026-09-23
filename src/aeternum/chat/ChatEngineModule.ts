export interface ChatMessage { role: "user" | "model" | "system"; text: string; timestamp: number; metadata?: Record<string, unknown>; }
export interface ChatRequest { text: string; mode: string; context?: unknown; }
export interface ChatResponse { text: string; metadata?: Record<string, unknown>; }

export type ChatDelegate = (request: ChatRequest) => Promise<ChatResponse>;

export class ChatEngineModule {
  readonly id = "chat-engine";
  private active = false;
  private readonly history = new Map<string, ChatMessage[]>();

  constructor(private readonly delegate?: ChatDelegate) {}

  activate(): void { this.active = true; }
  deactivate(): void { this.active = false; }

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    if (!this.active) throw new Error("CHAT_ENGINE_INACTIVE");
    if (!request.text.trim()) throw new Error("CHAT_TEXT_REQUIRED");
    if (!this.delegate) throw new Error("CHAT_DELEGATE_UNBOUND");
    const started = Date.now();
    this.push(request.mode, { role: "user", text: request.text, timestamp: started });
    const response = await this.delegate(request);
    this.push(request.mode, { role: "model", text: response.text, timestamp: Date.now(), metadata: response.metadata });
    return response;
  }

  clear(mode: string): void { this.history.set(mode, []); }
  getHistory(mode: string): ChatMessage[] { return [...(this.history.get(mode) ?? [])]; }

  private push(mode: string, message: ChatMessage): void {
    const history = this.history.get(mode) ?? [];
    history.push(message);
    if (history.length > 100) history.shift();
    this.history.set(mode, history);
  }
}
export const chatEngineModule = new ChatEngineModule();
