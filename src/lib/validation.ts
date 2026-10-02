import type { MessageInput, SymbolChoice } from '../types';
export const MESSAGE_MAX_LENGTH = 280;
export const NAME_MAX_LENGTH = 40;
export const SYMBOLS: readonly SymbolChoice[] = ['', '🩷', '🌷', '🎀', '✨'];
export class ValidationError extends Error {}
const codepointLength = (value: string) => Array.from(value).length;
function normalize(value: string) {
  // Keep line breaks, discard control characters and invisible direction overrides.
  return value.normalize('NFC').replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g,'').trim();
}
export function validateMessageInput(value: unknown): MessageInput {
  if(!value || typeof value!=='object' || Array.isArray(value)) throw new ValidationError('Please check your message.');
  const input=value as Record<string,unknown>;
  if(typeof input.message!=='string' || typeof input.author_name!=='string' ||
    typeof input.symbol!=='string' || typeof input.website!=='string' ||
    typeof input.request_id!=='string') throw new ValidationError('Please check the form fields.');
  if(input.website) throw new ValidationError('Unable to accept this submission.');
  const message=normalize(input.message);
  const author_name=normalize(input.author_name).replace(/\s+/g,' ');
  if(codepointLength(message)<3 || codepointLength(message)>MESSAGE_MAX_LENGTH)
    throw new ValidationError('Please write between 3 and 280 characters.');
  if(codepointLength(author_name)>NAME_MAX_LENGTH) throw new ValidationError('Please use a name of 40 characters or fewer.');
  if(!SYMBOLS.includes(input.symbol as SymbolChoice)) throw new ValidationError('Please choose one of the available symbols.');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.request_id))
    throw new ValidationError('Please reopen the form and try again.');
  if(/https?:\/\/|www\./i.test(message)) throw new ValidationError('Please keep your message free of links.');
  return {message,author_name:author_name||'Anonymous',symbol:input.symbol as SymbolChoice,website:'',request_id:input.request_id};
}
