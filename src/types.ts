export type MessageStatus = 'published' | 'pending' | 'rejected';
export type SymbolChoice = '' | '🩷' | '🌷' | '🎀' | '✨';
export interface SupportMessage {
  id: string; dot_id: string; message: string; author_name: string;
  symbol: SymbolChoice; status: MessageStatus; created_at: string;
}
export interface MessageInput {
  message: string; author_name: string; symbol: SymbolChoice; website: string; request_id: string;
}
export interface Occupancy { dot_ids: string[]; count: number }
export interface MessageRepository {
  readonly isDemo: boolean;
  getOccupancy(): Promise<Occupancy>;
  getMessage(dotId: string): Promise<SupportMessage>;
  submit(input: MessageInput): Promise<SupportMessage>;
  report(messageId: string): Promise<void>;
}
