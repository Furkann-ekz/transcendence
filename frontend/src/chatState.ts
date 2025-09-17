interface ChatMessage {
  type: 'public' | 'private';
  sender: string;
  content: string;
}

const MAX_MESSAGES = 50;
let messages: ChatMessage[] = []; // Artık sadece bellekte yaşayan boş bir dizi

export function addMessage(message: ChatMessage) {
  messages.push(message);

  // Eğer mesaj sayısı limiti aştıysa, en eski mesajı sil
  if (messages.length > MAX_MESSAGES) {
    messages.shift(); // Dizinin ilk elemanını kaldırır
  }
}

export function getMessages(): ChatMessage[] {
  // Bellekteki dizinin güncel halini döndür
  return messages;
}

export function clearMessages() {
  // Bellekteki diziyi temizle
  messages = [];
}