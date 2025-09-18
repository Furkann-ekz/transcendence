// frontend/src/pages/DashboardPage.ts
import { navigateTo } from '../router';
import { getSocket, disconnectSocket } from '../socket';
import { t } from '../i18n';
import { jwt_decode } from '../utils';
import type { Socket } from "socket.io-client";
import { addMessage, getMessages, clearMessages } from '../chatState';

// Sayfa bazında değişkenleri tanımla
let socket: Socket | null = null;
let myId: number | null = null;

export function render(): string {
  // Navigasyon çubuğunu sol, orta ve sağ olmak üzere üç ana bölüme ayırıyoruz.
  return `
    <div class="h-screen w-screen flex flex-col bg-gray-100">
      <nav class="bg-gray-800 text-white p-4 flex justify-between items-center w-full">
        
        <div class="w-1/3">
          </div>

        <div class="w-1/3 text-center">
          <h1 class="text-xl font-bold">Transcendence</h1>
        </div>

        <div class="w-1/3 flex justify-end items-center space-x-4">
          <a href="/lobby" data-link class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">${t('go_to_game')}</a>
          <button id="logout-button" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">${t('logout')}</button>
        </div>

      </nav>

      <div class="flex flex-grow overflow-hidden p-4 space-x-4">
        
        <div class="w-1/4 bg-white p-4 rounded-lg shadow-md overflow-y-auto">
          <h2 class="text-lg font-bold mb-4">${t('online_users')}</h2>
          <ul id="user-list" class="space-y-2"></ul>
        </div>

        <div class="w-3/4 flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
          <div class="p-4 border-b">
            <strong>${t('recipient')}:</strong> <span id="recipient-info">${t('everyone')}</span>
          </div>
          
          <ul id="messages" class="flex-grow p-4 overflow-y-auto"></ul>

          <form id="chat-form" class="p-4 bg-gray-200 flex rounded-b-lg">
            <input id="chat-input" autocomplete="off" placeholder="${t('chat_placeholder')}" class="border rounded-l-md p-2 flex-grow" />
            <button type="submit" class="bg-blue-500 text-white px-4 rounded-r-md hover:bg-blue-600">${t('send_button')}</button>
          </form>
        </div>

      </div>
    </div>
  `;
}

export function afterRender() {
  const logoutButton = document.getElementById('logout-button');
  logoutButton?.addEventListener('click', () => {
      clearMessages(); // Çıkış yaparken de temizle
      localStorage.removeItem('token');
      disconnectSocket();
      navigateTo('/');
  });

  socket = getSocket()!;
  socket.emit('requestUserList');

  const token = localStorage.getItem('token');
  if (token) {
      myId = jwt_decode(token).userId;
  }

  const userList = document.getElementById('user-list') as HTMLUListElement;
  const recipientInfo = document.getElementById('recipient-info') as HTMLSpanElement;
  const messagesList = document.getElementById('messages') as HTMLUListElement;
  const chatForm = document.getElementById('chat-form') as HTMLFormElement;
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;

  let selectedRecipient: any = null;

  // --- YENİ FONKSİYON: Arayüzü bellekten gelen son duruma göre yeniden çizer ---
  function renderMessages() {
    if (!messagesList) return;
    
    const currentMessages = getMessages(); // Bellekteki güncel mesajları al
    messagesList.innerHTML = ''; // Önce ekrandaki listeyi tamamen temizle

    currentMessages.forEach(msg => { // Bellekteki her mesaj için yeni bir <li> oluştur
      const item = document.createElement('li');
      const prefix = t(msg.type === 'public' ? 'chat_public_prefix' : 'chat_private_prefix');
      item.textContent = `${prefix} ${msg.sender}: ${msg.content}`;
      messagesList.appendChild(item);
    });

    // Her zaman en alta kaydır
    messagesList.scrollTop = messagesList.scrollHeight;
  }
  
  // Sayfa ilk yüklendiğinde mesajları çiz
  renderMessages();

  function selectRecipient(user: any) {
    selectedRecipient = user;
    recipientInfo.textContent = user.name || user.email || t('everyone');
    document.querySelectorAll('#user-list li').forEach(li => {
        li.classList.toggle('bg-blue-200', (li as HTMLElement).dataset.id == (user.id || 'all'));
    });
  }

  socket.on('update user list', (users: any[]) => {
    const currentSelectedId = selectedRecipient ? selectedRecipient.id : 'all';
    userList.innerHTML = ''; // Önce mevcut listeyi tamamen temizle
    
    // 1. ADIM: "Herkese" seçeneğini her zaman en üste ekle
    const allOption = document.createElement('li');
    allOption.textContent = t('everyone');
    allOption.dataset.id = 'all';
    allOption.classList.add('p-2', 'hover:bg-gray-200', 'cursor-pointer', 'rounded');
    allOption.addEventListener('click', () => selectRecipient({ id: 'all', name: t('everyone') }));
    userList.appendChild(allOption);

    // 2. ADIM: Mevcut kullanıcıyı (SEN) bul ve ikinci sıraya ekle
    const me = users.find(user => user.id === myId);
    if (me) {
        const myItem = document.createElement('li');
        myItem.dataset.id = me.id.toString();
        myItem.classList.add('p-2', 'hover:bg-gray-200', 'cursor-pointer', 'rounded');

        const myLink = document.createElement('a');
        myLink.href = `/profile/${me.id}`;
        myLink.setAttribute('data-link', '');
        myLink.textContent = `${me.name || me.email} ${t('you_suffix')}`;
        myItem.appendChild(myLink);
        
        myItem.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName === 'A') return;
            // Kendine özel mesaj atma hala engelli
        });
        userList.appendChild(myItem);
    }

    // 3. ADIM: Diğer tüm kullanıcıları listele
    users.forEach(user => {
        // Eğer kullanıcı "sen" değilsen, listeye ekle
        if (user.id !== myId) {
            const item = document.createElement('li');
            item.dataset.id = user.id.toString();
            item.classList.add('p-2', 'hover:bg-gray-200', 'cursor-pointer', 'rounded');

            const userLink = document.createElement('a');
            userLink.href = `/profile/${user.id}`;
            userLink.setAttribute('data-link', '');
            userLink.textContent = user.name || user.email;
            item.appendChild(userLink);
            
            item.addEventListener('click', (e) => {
                if ((e.target as HTMLElement).tagName === 'A') return;
                selectRecipient(user);
            });

            userList.appendChild(item);
        }
    });

    // Sayfa yenilendiğinde seçili kullanıcıyı koru veya varsayılana dön
    const newSelectedUser = users.find(u => u.id === currentSelectedId);
    selectRecipient(newSelectedUser || { id: 'all', name: t('everyone') });
  });

  socket.on('chat message', (msg: any) => {
    addMessage(msg);      // 1. Yeni mesajı belleğe ekle (ve gerekirse en eskisini sil)
    renderMessages();     // 2. Arayüzü bellekten gelen son duruma göre tamamen yeniden çiz
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

export function cleanup() {
  console.log('Dashboard sayfasından ayrılıyor, dinleyiciler temizleniyor...');

  const socket = getSocket();
  if (socket) {
    socket.off('update user list');
    socket.off('chat message');
  }
}
