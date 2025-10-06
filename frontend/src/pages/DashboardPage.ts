// frontend/src/pages/DashboardPage.ts
import { navigateTo } from '../router';
import { getSocket, disconnectSocket } from '../socket';
import { t } from '../i18n';
import { jwt_decode } from '../utils';
// --- DÜZELTME: 'import type' kullanıldı ---
import type { Socket } from "socket.io-client";
import { addMessage, getMessages, clearMessages } from '../chatState';
import { getFriends, respondToFriendRequest } from '../api/users';

// (Dosyanın geri kalanı zaten doğru olduğu için bir değişiklik gerekmiyor,
// sadece import satırının 'import type' şeklinde olduğundan emin ol.)

interface OnlineUser { id: number; email: string; name: string; }
interface FriendRequest { id: number; requester: { id: number; name: string; email: string; }; }
interface ChatMessage { type: 'public' | 'private'; sender: string; content: string; }
let socket: Socket | null = null;
let myId: number | null = null;
let selectedRecipient: { id: number | 'all', name: string } | null = null;

export function render(): string {
  return `
    <div class="h-screen w-screen flex flex-col bg-gray-100">
      <nav class="bg-gray-800 text-white p-4 flex justify-between items-center w-full">
        <div class="w-1/3"></div>
        <div class="w-1/3 text-center"><h1 class="text-xl font-bold">Transcendence</h1></div>
        <div class="w-1/3 flex justify-end items-center space-x-4">
          <a href="/profile/${jwt_decode(localStorage.getItem('token')!)?.userId}" data-link class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">${t('my_profile_button')}</a>
          <a href="/lobby" data-link class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">${t('go_to_game')}</a>
          <button id="logout-button" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">${t('logout')}</button>
        </div>
      </nav>
      <div class="flex flex-grow overflow-hidden p-4 space-x-4">
        <div class="w-1/4 flex flex-col space-y-4">
          
          <div class="bg-white p-4 rounded-lg shadow-md overflow-y-auto">
            <h2 class="text-lg font-bold mb-4">${t('friends_list_title')}</h2>
            <ul id="friend-list" class="space-y-2"></ul>
          </div>
          
          <div class="bg-white p-4 rounded-lg shadow-md overflow-y-auto">
            <h2 class="text-lg font-bold mb-4">${t('friend_requests')}</h2>
            <ul id="friend-request-list" class="space-y-2"></ul>
          </div>

          <div class="bg-white p-4 rounded-lg shadow-md overflow-y-auto">
            <h2 class="text-lg font-bold mb-4">${t('online_users')}</h2>
            <ul id="user-list" class="space-y-2"></ul>
          </div>

        </div>
        <div class="w-3/4 flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
          <div class="p-4 border-b"><strong>${t('recipient')}:</strong> <span id="recipient-info">${t('everyone')}</span></div>
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

// frontend/src/pages/DashboardPage.ts -> afterRender() fonksiyonu

export function afterRender() {
    socket = getSocket()!;
    const token = localStorage.getItem('token');
    if (token) { myId = jwt_decode(token).userId; }

    const friendList = document.getElementById('friend-list') as HTMLUListElement;
    const logoutButton = document.getElementById('logout-button');
    const userList = document.getElementById('user-list') as HTMLUListElement;
    const friendRequestList = document.getElementById('friend-request-list') as HTMLUListElement;
    const recipientInfo = document.getElementById('recipient-info') as HTMLSpanElement;
    const messagesList = document.getElementById('messages') as HTMLUListElement;
    const chatForm = document.getElementById('chat-form') as HTMLFormElement;
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;

    let myFriends: { id: number; name: string; }[] = [];
    let onlineUsers: OnlineUser[] = [];

    function renderMessages() {
        if (!messagesList) return;
        const currentMessages = getMessages();
        messagesList.innerHTML = '';
        currentMessages.forEach(msg => {
            const item = document.createElement('li');
            const prefix = t(msg.type === 'public' ? 'chat_public_prefix' : 'chat_private_prefix');
            item.textContent = `${prefix} ${msg.sender}: ${msg.content}`;
            messagesList.appendChild(item);
        });
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    async function renderFriendRequests() {
        if (!friendRequestList) return;
        try {
            const { pendingRequests } = await getFriends();
            if (pendingRequests.length === 0) {
                friendRequestList.innerHTML = `<li class="text-gray-500 text-sm">${t('no_friend_requests')}</li>`;
                return;
            }
            friendRequestList.innerHTML = '';
            pendingRequests.forEach((request: FriendRequest) => {
                const item = document.createElement('li');
                item.className = 'flex justify-between items-center';
                item.innerHTML = `
                    <span>${request.requester.name || request.requester.email}</span>
                    <div class="flex space-x-2">
                        <button data-id="${request.id}" class="accept-friend-btn bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600">${t('accept_button')}</button>
                        <button data-id="${request.id}" class="reject-friend-btn bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600">${t('reject_button')}</button>
                    </div>
                `;
                friendRequestList.appendChild(item);
            });
            document.querySelectorAll('.accept-friend-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = (e.target as HTMLElement).dataset.id;
                    if (id) {
                        await respondToFriendRequest(parseInt(id), true);
                        await fetchAndRenderFriends(); // Arkadaş listesini de güncelle
                        renderFriendRequests();
                    }
                });
            });
            document.querySelectorAll('.reject-friend-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = (e.target as HTMLElement).dataset.id;
                    if (id) {
                        await respondToFriendRequest(parseInt(id), false);
                        renderFriendRequests();
                    }
                });
            });
        } catch (error) {
            console.error("Failed to render friend requests:", error);
            friendRequestList.innerHTML = `<li class="text-red-500 text-sm">İstekler yüklenemedi.</li>`;
        }
    }
    
    // --- YENİ FONKSİYON: Arkadaş listesini çeker ve saklar ---
    async function fetchAndRenderFriends() {
        try {
            const { friends } = await getFriends();
            myFriends = friends;
            // Online kullanıcı listesi henüz gelmemiş olabilir, o yüzden burada render etmiyoruz.
            // Sadece veriyi çekip saklıyoruz.
        } catch (error) {
            console.error("Failed to fetch friends:", error);
        }
    }

    function selectRecipient(user: { id: number | 'all', name: string }) {
        selectedRecipient = user;
        recipientInfo.textContent = user.name || t('everyone');
        document.querySelectorAll('#user-list li, #friend-list li').forEach(li => {
            const liElement = li as HTMLElement;
            liElement.classList.toggle('bg-blue-200', liElement.dataset.id === String(user.id));
        });
    }

    function renderFriendList() {
        if (!friendList) return;
        if (myFriends.length === 0) {
            friendList.innerHTML = `<li class="text-gray-500 text-sm">${t('no_friends_message')}</li>`;
            return;
        }

        const onlineFriendIds = new Set(onlineUsers.map(u => u.id));
        
        friendList.innerHTML = myFriends.map(friend => {
            const isOnline = onlineFriendIds.has(friend.id);
            return `
                <li class="flex items-center justify-between p-2 hover:bg-gray-200 rounded" data-id="${friend.id}" data-name="${friend.name}">
                    <a href="/profile/${friend.id}" data-link class="flex items-center" draggable="false">
                        <span class="w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}"></span>
                        <span>${friend.name}</span>
                    </a>
                    ${isOnline ? `<button class="invite-btn bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600" data-invite-id="${friend.id}">Davet Et</button>` : ''}
                </li>
            `;
        }).join('');
    }

    // VERİLERİ YENİLEMEK İÇİN ANA FONKSİYON
    async function refreshAllLists() {
        try {
            const { friends } = await getFriends();
            myFriends = friends;
            socket?.emit('requestUserList'); // Online listesini de tetikle
            renderFriendRequests(); // İstekleri de yenile
        } catch (error) {
            console.error("Listeler yenilenirken hata oluştu:", error);
        }
    }

    logoutButton?.addEventListener('click', () => {
        clearMessages();
        localStorage.removeItem('token');
        disconnectSocket();
        navigateTo('/');
    });

    renderMessages();
    renderFriendRequests();
    fetchAndRenderFriends(); // Sayfa yüklenince arkadaşları çek

    socket.emit('requestUserList');

    socket.on('friendship_updated', () => {
        console.log('Arkadaşlık durumu güncellendi, listeler yenileniyor...');
        renderFriendRequests();
        fetchAndRenderFriends(); // Arkadaş listesi değişmiş olabilir, yeniden çek
    });

    socket.on('update user list', (users: OnlineUser[]) => {
        // --- BU BLOK GÜNCELLENDİ ---
        
        // Önce arkadaş listesini render et
        onlineUsers = users; // Gelen online listesini sakla
        renderFriendList(); // Arkadaş listesini bu yeni bilgiyle render et
        const currentSelectedId = selectedRecipient ? selectedRecipient.id : 'all';
        userList.innerHTML = '';

        const allOption = document.createElement('li');
        allOption.textContent = t('everyone');
        allOption.dataset.id = 'all';
        allOption.classList.add('p-2', 'hover:bg-gray-200', 'cursor-pointer', 'rounded');
        allOption.addEventListener('click', () => selectRecipient({ id: 'all', name: t('everyone') }));
        userList.appendChild(allOption);
        
        users.forEach(user => {
            if (user.id !== myId) {
                const item = document.createElement('li');
                item.dataset.id = String(user.id);
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

        const newSelectedUser = users.find(u => u.id === currentSelectedId);
        selectRecipient(newSelectedUser || { id: 'all', name: t('everyone') });
    });

    socket.on('friendship_updated', refreshAllLists);

    socket.on('chat message', (msg: ChatMessage) => {
        addMessage(msg);
        renderMessages();
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

    // Bu, dinamik olarak eklenen "Davet Et" butonlarına tıklama olayı atar.
    document.body.addEventListener('click', function(event) {
        const target = event.target as HTMLElement;
        if (target.classList.contains('invite-btn')) {
            const recipientId = parseInt(target.dataset.inviteId!, 10);
            if (socket && recipientId) {
                socket.emit('invite_to_game', { recipientId });
                alert('Oyun daveti gönderildi!');
            }
        }
    });
    refreshAllLists();
}

export function cleanup() {
    const socket = getSocket();
    if (socket) {
        socket.off('update user list');
        socket.off('chat message');
        socket.off('friendship_updated');
    }
}