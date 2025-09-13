// frontend/src/chatState.ts

interface ChatMessage {
  type: 'public' | 'private';
  sender: string;
  content: string;
}

const STORAGE_KEY = 'chat_messages_v2'; // Veri yapısı değiştiği için anahtarı güncelleyelim

let messages: ChatMessage[] = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');

export function addMessage(message: ChatMessage) {
  messages.push(message);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

export function getMessages(): ChatMessage[] {
  return messages;
}

export function clearMessages() {
  messages = [];
  sessionStorage.removeItem(STORAGE_KEY);
}