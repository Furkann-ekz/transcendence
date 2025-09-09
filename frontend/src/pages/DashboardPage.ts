// frontend/src/pages/DashboardPage.ts
import { navigateTo } from '../router';
import type { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from '../socket'; // EKSİK IMPORT'LAR EKLENDİ
import { jwt_decode } from '../utils'; // EKSİK IMPORT EKLENDİ

let socket: Socket | null = null;
let myId: number | null = null;

export function render(): string {
  // Bu fonksiyonun içeriği doğruydu, aynı kalıyor.
  return `
    <div class="h-screen w-screen flex flex-col">
      <nav class="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 class="text-xl font-bold">Transcendence</h1>
        <div>
          <a href="/lobby" data-link class="bg-green-500 ...">Oyuna Git</a>
          <button id="logout-button" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Çıkış Yap</button>
        </div>
      </nav>
      <div class="flex flex-grow overflow-hidden">
        <div class="w-1/4 bg-gray-200 p-4 overflow-y-auto">
          <h2 class="text-lg font-bold mb-4">Online Kullanıcılar</h2>
          <ul id="user-list"></ul>
        </div>
        <div class="w-3/4 flex flex-col">
          <div class="p-4">
            <strong>Gönderilecek Kişi:</strong> <span id="recipient-info">Herkese</span>
          </div>
          <ul id="messages" class="flex-grow p-4 overflow-y-auto bg-gray-50"></ul>
          <form id="chat-form" class="p-4 bg-gray-200 flex">
            <input id="chat-input" autocomplete="off" placeholder="Mesajınızı yazın..." class="border rounded-l-md p-2 flex-grow" />
            <button type="submit" class="bg-blue-500 text-white px-4 rounded-r-md">Gönder</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const logoutButton = document.getElementById('logout-button');
    logoutButton?.addEventListener('click', () => {
        localStorage.removeItem('token');
        disconnectSocket();
        navigateTo('/');
    });

    socket = getSocket(); // getSocket() çağrısını düzelttik
    if (!socket) {
        console.error("Socket bağlantısı bulunamadı, login sayfasına yönlendiriliyor.");
        navigateTo('/');
        return;
    }

    const token = localStorage.getItem('token');
    if (token) {
        myId = jwt_decode(token).userId;
    }

  const userList = document.getElementById('user-list') as HTMLUListElement;
  const recipientInfo = document.getElementById('recipient-info') as HTMLSpanElement;
  const messages = document.getElementById('messages') as HTMLUListElement;
  const chatForm = document.getElementById('chat-form') as HTMLFormElement;
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;

  let selectedRecipient: any = null;

  function selectRecipient(user: any) {
    selectedRecipient = user;
    recipientInfo.textContent = user.name || user.email || 'Herkese';
    document.querySelectorAll('#user-list li').forEach(li => {
        li.classList.toggle('selected', (li as HTMLElement).dataset.id == (user.id || 'all'));
    });
  }

  socket.on('update user list', (users: any[]) => {
    userList.innerHTML = '';
    
    const allOption = document.createElement('li');
    allOption.textContent = 'Herkese';
    allOption.dataset.id = 'all';
    allOption.addEventListener('click', () => selectRecipient({ id: 'all', name: 'Herkese' }));
    userList.appendChild(allOption);

    users.forEach(user => {
        if (user.id === myId) return;
        const item = document.createElement('li');
        item.textContent = user.name || user.email;
        item.dataset.id = user.id;
        item.addEventListener('click', () => selectRecipient(user));
        userList.appendChild(item);
    });
    if (!selectedRecipient) {
       selectRecipient({ id: 'all', name: 'Herkese' });
    }
  });

  socket.on('chat message', (msg: string) => {
    const item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  });

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (chatInput.value && socket) {
      if (selectedRecipient && selectedRecipient.id !== 'all') {
        socket.emit('private message', {
          recipientId: selectedRecipient.id,
          message: chatInput.value
        });
      } else {
        socket.emit('chat message', chatInput.value);
      }
      chatInput.value = '';
    }
  });
}

export function cleanup() {} // şimdilik boş