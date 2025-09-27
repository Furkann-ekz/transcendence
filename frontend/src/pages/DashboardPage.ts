// frontend/src/pages/DashboardPage.ts
import { navigateTo } from '../router';
import { getSocket, disconnectSocket } from '../socket';
import { t } from '../i18n';
import { jwt_decode } from '../utils';
import type { Socket } from "socket.io-client";
import { addMessage, getMessages, clearMessages } from '../chatState';
import { getFriends, respondToFriendRequest } from '../api/users';

// --- Tip Tanımlamaları ---
interface OnlineUser {
    id: number;
    email: string;
    name: string;
}

interface FriendRequest {
    id: number; // Bu, friendship kaydının ID'sidir
    requester: {
        id: number;
        name: string;
        email: string;
    };
}

interface ChatMessage {
    type: 'public' | 'private';
    sender: string;
    content: string;
}

// --- Sayfa Değişkenleri ---
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
          <a href="/lobby" data-link class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">${t('go_to_game')}</a>
          <button id="logout-button" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">${t('logout')}</button>
        </div>
      </nav>
      <div class="flex flex-grow overflow-hidden p-4 space-x-4">
        <div class="w-1/4 flex flex-col space-y-4">
          <div class="bg-white p-4 rounded-lg shadow-md overflow-y-auto">
            <h2 class="text-lg font-bold mb-4">${t('online_users')}</h2>
            <ul id="user-list" class="space-y-2"></ul>
          </div>
          <div class="bg-white p-4 rounded-lg shadow-md overflow-y-auto">
            <h2 class="text-lg font-bold mb-4">${t('friend_requests')}</h2>
            <ul id="friend-request-list" class="space-y-2"></ul>
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
    
    <div id="invite-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-xl text-center">
            <p id="invite-text" class="text-lg mb-6"></p>
            <div class="flex space-x-4 justify-center">
                <button id="accept-invite-btn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded">Kabul Et</button>
                <button id="decline-invite-btn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded">Reddet</button>
            </div>
        </div>
    </div>
  `;
}

export function afterRender() {
    socket = getSocket()!;
    const token = localStorage.getItem('token');
    if (token) { myId = jwt_decode(token).userId; }

    const inviteModal = document.getElementById('invite-modal') as HTMLDivElement;
    const inviteText = document.getElementById('invite-text') as HTMLParagraphElement;
    const acceptInviteBtn = document.getElementById('accept-invite-btn') as HTMLButtonElement;
    const declineInviteBtn = document.getElementById('decline-invite-btn') as HTMLButtonElement;
    let inviter: OnlineUser | null = null;
    
    const logoutButton = document.getElementById('logout-button');
    const userList = document.getElementById('user-list') as HTMLUListElement;
    const friendRequestList = document.getElementById('friend-request-list') as HTMLUListElement;
    const recipientInfo = document.getElementById('recipient-info') as HTMLSpanElement;
    const messagesList = document.getElementById('messages') as HTMLUListElement;
    const chatForm = document.getElementById('chat-form') as HTMLFormElement;
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;

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

    function selectRecipient(user: { id: number | 'all', name: string }) {
        selectedRecipient = user;
        recipientInfo.textContent = user.name || t('everyone');
        document.querySelectorAll('#user-list li').forEach(li => {
            const liElement = li as HTMLElement;
            liElement.classList.toggle('bg-blue-200', liElement.dataset.id === String(user.id));
        });
    }

    function handleInviteClick(targetUser: OnlineUser) {
        if (socket) {
            console.log(`Inviting ${targetUser.name} to a game.`);
            socket.emit('invite_to_game', { targetUserId: targetUser.id });
        }
    }

    declineInviteBtn.addEventListener('click', () => {
        if (socket && inviter) {
            socket.emit('decline_game_invite', { senderId: inviter.id });
        }
        inviteModal.classList.add('hidden');
        inviteModal.classList.remove('flex');
        inviter = null;
    });

    acceptInviteBtn.addEventListener('click', () => {
        if (socket && inviter) {
            socket.emit('accept_game_invite', { senderId: inviter.id });
        }
        inviteModal.classList.add('hidden');
        inviteModal.classList.remove('flex');
        inviter = null;
    });

    logoutButton?.addEventListener('click', () => {
        clearMessages();
        localStorage.removeItem('token');
        disconnectSocket();
        navigateTo('/');
    });

    renderMessages();
    renderFriendRequests();
    socket.emit('requestUserList');

    socket.on('friendship_updated', () => {
        renderFriendRequests();
    });
    
    socket.on('update user list', (users: OnlineUser[]) => {
        const currentSelectedId = selectedRecipient ? selectedRecipient.id : 'all';
        userList.innerHTML = '';

        const allOption = document.createElement('li');
        allOption.textContent = t('everyone');
        allOption.dataset.id = 'all';
        allOption.classList.add('p-2', 'hover:bg-gray-200', 'cursor-pointer', 'rounded');
        allOption.addEventListener('click', () => selectRecipient({ id: 'all', name: t('everyone') }));
        userList.appendChild(allOption);
        
        const me = users.find(user => user.id === myId);
        if (me) {
            const myItem = document.createElement('li');
            myItem.dataset.id = String(me.id);
            myItem.className = 'p-2 hover:bg-gray-200 rounded';
            const userLink = document.createElement('a');
            userLink.href = `/profile/${me.id}`;
            userLink.setAttribute('data-link', '');
            userLink.textContent = `${me.name || me.email} ${t('you_suffix')}`;
            myItem.appendChild(userLink);
            userList.appendChild(myItem);
        }

        users.forEach(user => {
            if (user.id !== myId) {
                const item = document.createElement('li');
                item.className = 'p-2 hover:bg-gray-200 rounded flex justify-between items-center';
                
                const userInfo = document.createElement('div');
                userInfo.className = 'cursor-pointer';
                
                const userLink = document.createElement('a');
                userLink.href = `/profile/${user.id}`;
                userLink.setAttribute('data-link', '');
                userLink.textContent = user.name || user.email;
                userInfo.appendChild(userLink);
                
                userInfo.addEventListener('click', (e) => {
                    if ((e.target as HTMLElement).tagName === 'A') return;
                    selectRecipient(user);
                });

                const inviteButton = document.createElement('button');
                inviteButton.textContent = 'Davet Et';
                inviteButton.className = 'text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600';
                inviteButton.onclick = () => handleInviteClick(user);

                item.appendChild(userInfo);
                item.appendChild(inviteButton);
                userList.appendChild(item);
            }
        });

        const newSelectedUser = users.find(u => u.id === currentSelectedId);
        selectRecipient(newSelectedUser || { id: 'all', name: t('everyone') });
    });

    socket.on('chat message', (msg: ChatMessage) => {
        addMessage(msg);
        renderMessages();
    });

    socket.on('receive_game_invite', ({ fromUser }: { fromUser: OnlineUser }) => {
        inviter = fromUser;
        inviteText.textContent = `${fromUser.name} sizi bir Pong maçına davet ediyor!`;
        inviteModal.classList.remove('hidden');
        inviteModal.classList.add('flex');
    });

    socket.on('invite_declined', ({ fromUser }: { fromUser: OnlineUser }) => {
        alert(`${fromUser.name} davetinizi reddetti.`);
    });
    
    socket.on('start_private_game', () => {
        navigateTo('/online-game');
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
    const socket = getSocket();
    if (socket) {
        socket.off('update user list');
        socket.off('chat message');
        socket.off('friendship_updated');
        socket.off('receive_game_invite');
        socket.off('invite_declined');
        socket.off('start_private_game');
    }
}