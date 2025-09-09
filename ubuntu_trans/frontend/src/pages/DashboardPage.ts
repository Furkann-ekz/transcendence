import { navigateTo } from '../router';
import type { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from '../socket';
import { jwt_decode } from '../utils';

let myId: number | null = null;
let selectedRecipient: any = null;

// Dinleyici fonksiyonlarını dışarıda tanımlıyoruz ki hem ekleyip hem kaldırabilelim
const handleUpdateUserList = (users: any[]) => {
    const userList = document.getElementById('user-list') as HTMLUListElement;
    if (!userList) return;

    const selectedId = selectedRecipient?.id?.toString() || 'all';
    userList.innerHTML = '';

    const allOption = document.createElement('li');
    allOption.textContent = 'Herkese';
    allOption.dataset.id = 'all';
    userList.appendChild(allOption);

    users.forEach(user => {
        if (user.id === myId) return;
        const item = document.createElement('li');
        item.textContent = user.name || user.email;
        item.dataset.id = user.id.toString();
        userList.appendChild(item);
    });

    document.querySelectorAll('#user-list li').forEach(li => {
        li.addEventListener('click', () => {
             const htmlLi = li as HTMLElement;
             const userId = htmlLi.dataset.id;
             const user = users.find(u => u.id.toString() === userId) || {id: 'all', name: 'Herkese'};
             selectRecipient(user);
        });
    });

    const currentSelection = Array.from(userList.children).find(li => (li as HTMLElement).dataset.id === selectedId) as HTMLElement;
    if (currentSelection) {
        const user = users.find(u => u.id.toString() === selectedId) || {id: 'all', name: 'Herkese'};
        selectRecipient(user);
    } else {
        selectRecipient({id: 'all', name: 'Herkese'});
    }
};

const handleChatMessage = (msg: string) => {
    const messages = document.getElementById('messages') as HTMLUListElement;
    if (!messages) return;
    const item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
};

function selectRecipient(user: any) {
    selectedRecipient = user;
    const recipientInfo = document.getElementById('recipient-info') as HTMLSpanElement;
    if (recipientInfo) {
        recipientInfo.textContent = user.name || user.email || 'Herkese';
    }

    document.querySelectorAll('#user-list li').forEach(li => {
        const htmlLi = li as HTMLElement;
        htmlLi.classList.toggle('selected', htmlLi.dataset.id === (user.id?.toString() || 'all'));
    });
}

export function render(): string {
  return `
    <div class="h-screen w-screen flex flex-col">
      <nav class="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 class="text-xl font-bold">Transcendence</h1>
        <div>
          <a href="/lobby" data-link class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-4">Oyuna Git</a>
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
    const socket = getSocket();
    if (!socket) { navigateTo('/'); return; }

    const token = localStorage.getItem('token');
    if (token) myId = jwt_decode(token).userId;

    socket.on('update user list', handleUpdateUserList);
    socket.on('chat message', handleChatMessage);

    // Sayfa yüklendiğinde sunucudan güncel listeyi talep et
    socket.emit('requestUserList');

    const logoutButton = document.getElementById('logout-button');
    logoutButton?.addEventListener('click', () => {
        localStorage.removeItem('token');
        disconnectSocket();
        navigateTo('/');
    });

    const chatForm = document.getElementById('chat-form') as HTMLFormElement;
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;

    const handleSubmit = (e: Event) => {
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
    };
    chatForm.addEventListener('submit', handleSubmit);
}

export function cleanup() {
    const socket = getSocket();
    if (socket) {
        socket.off('update user list', handleUpdateUserList);
        socket.off('chat message', handleChatMessage);
    }
    selectedRecipient = null;
}
