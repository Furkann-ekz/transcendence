// frontend/src/chatState.ts

const STORAGE_KEY = 'chat_messages';

let messages: string[] = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');

export function addMessage(message: string) {
  messages.push(message);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

export function getMessages(): string[] {
  return messages;
}

// --- YENİ EKLENECEK FONKSİYON ---
export function clearMessages() {
  messages = []; // Hafızadaki array'i boşalt
  sessionStorage.removeItem(STORAGE_KEY); // sessionStorage'dan sil
}