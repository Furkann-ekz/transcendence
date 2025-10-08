// frontend/src/pages/DashboardPage.ts
import { navigateTo } from '../router';
import { getSocket, disconnectSocket } from '../socket';
import { t } from '../i18n';
import { jwt_decode } from '../utils';
import type { Socket } from "socket.io-client";
import { addMessage, getMessages, clearMessages } from '../chatState';
import { getFriends, respondToFriendRequest } from '../api/users';
import { showToast } from '../utils/notifications';

interface OnlineUser { id: number; email: string; name: string; }
interface FriendRequest { id: number; requester: { id: number; name: string; email: string; }; }

// Düzeltilmiş ChatMessage Arayüzü
interface ChatMessage {
  type: 'public' | 'private';
  sender: { id: number; name: string; } | string;
  recipient?: { id: number; name: string; };
  content: string;
}
// chatState.ts dosyasındaki arayüzün de bununla aynı olduğundan emin ol.

let socket: Socket | null = null;
let myId: number | null = null;
let selectedRecipient: { id: number | 'all', name: string } | null = null;
let appClickListener: ((event: MouseEvent) => void) | null = null;

export function render(): string {
    const token = localStorage.getItem('token');
    const myUserId = token ? jwt_decode(token).userId : '/';
  return `
    <div class="h-screen w-screen flex flex-col bg-gray-100">
      <nav class="bg-gray-800 text-white p-4 flex justify-between items-center w-full">
        <div class="w-1/3"></div>
        <div class="w-1/3 text-center"><h1 class="text-xl font-bold">Transcendence</h1></div>
        <div class="w-1/3 flex justify-end items-center space-x-4">
          <a href="/profile/${myUserId}" data-link class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">${t('my_profile_button')}</a>
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

export function afterRender() {
    socket = getSocket()!;
    const token = localStorage.getItem('token');
    if (token) { myId = jwt_decode(token).userId; }

    const friendListEl = document.getElementById('friend-list');
    const userListEl = document.getElementById('user-list');
    const friendRequestListEl = document.getElementById('friend-request-list');
    const recipientInfoEl = document.getElementById('recipient-info');
    const messagesListEl = document.getElementById('messages');
    
    let myFriends: { id: number; name: string; }[] = [];
    let onlineUsers: OnlineUser[] = [];

    function renderMessages() {
        if (!messagesListEl) return;
        messagesListEl.innerHTML = getMessages().map(msg => {
            const item = document.createElement('li');
            let textContent = '';
            if (msg.type === 'public') {
                const senderName = typeof msg.sender === 'string' ? msg.sender : msg.sender.name;
                textContent = `${t('chat_public_prefix')} ${senderName}: ${msg.content}`;
            } else if (msg.type === 'private' && msg.recipient && typeof msg.sender === 'object') {
                if (msg.sender.id === myId) {
                    textContent = `(${t('private_to')} ${msg.recipient.name}): ${msg.content}`;
                    item.style.color = '#4a5568';
                } else {
                    textContent = `(${t('private_from')} ${msg.sender.name}) ${msg.sender.name}: ${msg.content}`;
                    item.style.fontWeight = '600';
                }
            }
            item.textContent = textContent;
            return item.outerHTML;
        }).join('');
        messagesListEl.scrollTop = messagesListEl.scrollHeight;
    }

    function renderFriendRequests(pendingRequests: FriendRequest[]) {
        if (!friendRequestListEl) return;
        friendRequestListEl.innerHTML = pendingRequests.length === 0
            ? `<li class="text-gray-500 text-sm">${t('no_friend_requests')}</li>`
            : pendingRequests.map(req => `
                <li class="flex justify-between items-center">
                    <span>${req.requester.name || req.requester.email}</span>
                    <div class="flex space-x-2">
                        <button data-id="${req.id}" class="accept-friend-btn bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600">${t('accept_button')}</button>
                        <button data-id="${req.id}" class="reject-friend-btn bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600">${t('reject_button')}</button>
                    </div>
                </li>
            `).join('');
    }

    function renderFriendList() {
        if (!friendListEl) return;
        const onlineFriendIds = new Set(onlineUsers.map(u => u.id));
        friendListEl.innerHTML = myFriends.length === 0
            ? `<li class="text-gray-500 text-sm">${t('no_friends_message')}</li>`
            : myFriends.map(friend => {
                const isOnline = onlineFriendIds.has(friend.id);
                return `
                    <li class="flex items-center justify-between p-2 hover:bg-gray-200 rounded cursor-pointer" data-id="${friend.id}" data-name="${friend.name}">
                        <a href="/profile/${friend.id}" data-link class="flex items-center">
                            <span class="w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}"></span>
                            <span>${friend.name}</span>
                        </a>
                        ${isOnline ? `<button class="invite-btn bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600" data-invite-id="${friend.id}">${t('invite_button')}</button>` : ''}
                    </li>
                `;
            }).join('');
    }

    function renderOnlineUsers() {
        if (!userListEl) return;
        userListEl.innerHTML = '';
        const allOption = document.createElement('li');
        allOption.textContent = t('everyone');
        allOption.dataset.id = 'all';
        allOption.className = 'p-2 hover:bg-gray-200 cursor-pointer rounded';
        userListEl.appendChild(allOption);
        onlineUsers.forEach(user => {
            if (user.id !== myId) {
                const item = document.createElement('li');
                item.dataset.id = String(user.id);
                item.className = 'p-2 hover:bg-gray-200 rounded flex justify-between items-center';
                const userLink = `<a href="/profile/${user.id}" data-link>${user.name || user.email}</a>`;
                const inviteButton = `<button class="invite-btn bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600" data-invite-id="${user.id}">${t('invite_button')}</button>`;
                item.innerHTML = `${userLink}${inviteButton}`;
                userListEl.appendChild(item);
            }
        });
    }

    function selectRecipient(user: { id: number | 'all', name: string }) {
        selectedRecipient = user;
        if (recipientInfoEl) recipientInfoEl.textContent = user.name || t('everyone');
        document.querySelectorAll('#user-list li, #friend-list li').forEach(li => {
            li.classList.toggle('bg-blue-200', (li as HTMLElement).dataset.id === String(user.id));
        });
    }

    async function refreshAllLists() {
        try {
            const { friends, pendingRequests } = await getFriends();
            myFriends = friends;
            renderFriendRequests(pendingRequests);
            socket?.emit('requestUserList');
        } catch (error) {
            console.error("Listeler yenilenirken hata oluştu:", error);
        }
    }

    document.getElementById('logout-button')?.addEventListener('click', () => {
        clearMessages();
        localStorage.removeItem('token');
        disconnectSocket();
        navigateTo('/');
    });

    document.getElementById('chat-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const chatInput = document.getElementById('chat-input') as HTMLInputElement;
        if (chatInput.value && socket) {
            if (selectedRecipient && selectedRecipient.id !== 'all') {
                socket.emit('private message', { recipientId: selectedRecipient.id, message: chatInput.value });
            } else {
                socket.emit('chat message', chatInput.value);
            }
            chatInput.value = '';
        }
    });

    appClickListener = async (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const handleFriendAction = async (action: Promise<any>) => {
            await action;
            await refreshAllLists();
        };

        if (target.classList.contains('accept-friend-btn')) {
            handleFriendAction(respondToFriendRequest(parseInt(target.dataset.id!), true));
        } else if (target.classList.contains('reject-friend-btn')) {
            handleFriendAction(respondToFriendRequest(parseInt(target.dataset.id!), false));
        } else if (target.classList.contains('invite-btn')) {
            const recipientId = parseInt(target.dataset.inviteId!, 10);
            if (socket && recipientId) {
                socket.emit('invite_to_game', { recipientId });
                showToast(t('invitation_sent'));
            }
        } else {
            const userLi = target.closest<HTMLElement>('#friend-list li, #user-list li');
            if (userLi && !target.closest('a') && !target.closest('button')) {
                const id = userLi.dataset.id === 'all' ? 'all' : parseInt(userLi.dataset.id!);
                const name = userLi.dataset.name || userLi.querySelector('a')?.textContent || t('everyone');
                selectRecipient({ id, name });
            }
        }
    };
    document.getElementById('app')?.addEventListener('click', appClickListener);

    socket.on('update user list', (users: OnlineUser[]) => {
        onlineUsers = users;
        renderFriendList();
        renderOnlineUsers();
        const currentRecipientStillOnline = selectedRecipient && selectedRecipient.id !== 'all' 
            ? onlineUsers.some(u => u.id === selectedRecipient!.id) : true;
        if (!currentRecipientStillOnline) {
            selectRecipient({ id: 'all', name: t('everyone') });
        }
    });

    socket.on('chat message', (msg: any) => { // 'any' kullanarak geçici çözüm
        addMessage(msg as ChatMessage);
        renderMessages();
    });

    socket.on('chat_error', (data) => alert(data.message));
    socket.on('friendship_updated', refreshAllLists);

    renderMessages();
    refreshAllLists();
}

export function cleanup() {
    if (socket) {
        socket.off('update user list');
        socket.off('chat message');
        socket.off('friendship_updated');
        socket.off('chat_error');
    }
    if (appClickListener) {
        document.getElementById('app')?.removeEventListener('click', appClickListener);
        appClickListener = null;
    }
}