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
interface ChatMessage {
  type: 'public' | 'private';
  sender: { id: number; name: string; } | string;
  recipient?: { id: number; name: string; };
  content: string;
}

let socket: Socket | null = null;
let myId: number | null = null;
let selectedRecipient: { id: number | 'all', name: string } | null = null;

let appClickListener: ((event: MouseEvent) => void) | null = null;
let logoutClickListener: (() => void) | null = null;
let chatFormSubmitListener: ((event: SubmitEvent) => void) | null = null;

export function render(): string
{
	const token = localStorage.getItem('token');
	const myUserId = token ? jwt_decode(token).userId : '/';
  return `
	<div class="h-screen w-screen flex flex-col bg-[#171A21] text-slate-100">
	  <nav class="sticky top-0 z-10 bg-[#171A21] border-b border-slate-700/50 flex-shrink-0">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap md:flex-nowrap items-center justify-center md:justify-between gap-4">
        <div class="w-full md:w-auto text-center md:text-left">
          <h1 class="text-2xl font-bold tracking-tight text-white">Transcendence</h1>
        </div>
        <div class="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
          <a href="/profile/${myUserId}" data-link class="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-5 transition">${t('my_profile_button')}</a>
          <a href="/lobby" data-link class="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-5 transition">${t('go_to_game')}</a>
          <button id="logout-button" class="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-5 transition">${t('logout')}</button>
        </div>
      </div>
	  </nav>

	  <main class="flex-grow flex flex-col p-4 overflow-hidden">
      <div class="max-w-6xl mx-auto w-full flex-grow grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
        <div class="md:col-span-4 flex flex-col gap-6 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div class="bg-[#272A33] rounded-xl p-5">
            <h2 class="text-lg font-semibold text-slate-100 mb-4">${t('friends_list_title')}</h2>
            <ul id="friend-list" class="space-y-3"></ul>
          </div>
          <div class="bg-[#272A33] rounded-xl p-5">
            <h2 class="text-lg font-semibold text-slate-100 mb-4">${t('friend_requests')}</h2>
            <ul id="friend-request-list" class="space-y-3"></ul>
          </div>
          <div class="bg-[#272A33] rounded-xl p-5">
            <h2 class="text-lg font-semibold text-slate-100 mb-4">${t('online_users')}</h2>
            <ul id="user-list" class="space-y-3"></ul>
          </div>
        </div>

        <div class="md:col-span-8 flex flex-col bg-[#272A33] rounded-xl overflow-hidden">
          <div class="p-4 border-b border-slate-700/50 flex items-center gap-3 flex-shrink-0">
            <strong class="text-slate-200 font-medium">${t('recipient')}:</strong>
            <span id="recipient-info" class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-600 text-slate-100">${t('everyone')}</span>
          </div>
          <ul id="messages" class="flex-grow p-6 overflow-y-auto space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"></ul>
          <form id="chat-form" class="p-4 bg-[#272A33] border-t border-slate-700/50 flex-shrink-0">
            <div class="flex gap-3">
              <input id="chat-input" autocomplete="off" placeholder="${t('chat_placeholder')}" class="border-transparent w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-[#171A21] text-white shadow-sm placeholder-slate-400" />
              <button type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-lg font-semibold shadow-sm transition">${t('send_button')}</button>
            </div>
          </form>
        </div>
      </div>
	  </main>
	</div>
  `;
}

export function afterRender()
{
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

	function renderMessages()
	{
		if (!messagesListEl) return;
		const messages = getMessages();
		const isScrolledToBottom = messagesListEl.scrollHeight - messagesListEl.clientHeight <= messagesListEl.scrollTop + 1;

		messagesListEl.innerHTML = messages.map(msg =>
		{
			const senderName = typeof msg.sender === 'string' ? msg.sender : msg.sender.name;
			const isMe = typeof msg.sender === 'object' && msg.sender.id === myId;

			const rowClass = isMe ? 'justify-end' : 'justify-start';

			let bubbleClass = '';
			let meta = '';

			if (msg.type === 'private') {
				if (isMe) {
					bubbleClass = 'bg-indigo-600 text-white';
					meta = `<div class="text-[11px] opacity-80 mb-1">${t('private_to')} ${msg.recipient?.name}</div>`;
				} else {
					bubbleClass = 'bg-emerald-900/70 text-emerald-100';
					meta = `<div class="text-[11px] opacity-70 mb-1">${t('private_from')} ${senderName}</div>`;
				}
			} else { // public message
				if (isMe) {
					bubbleClass = 'bg-slate-700 text-slate-100';
					meta = `<div class="text-[11px] text-slate-400 mb-1">${senderName} (${t('you')})</div>`;
				} else {
					bubbleClass = 'bg-[#363A43] text-slate-200';
					meta = `<div class="text-[11px] text-slate-400 mb-1">${senderName}</div>`;
				}
			}

			const content = `
        <li class="flex ${rowClass} animate-fade-in-up">
          <div class="max-w-[80%] rounded-xl px-4 py-2.5 ${bubbleClass} shadow-md">
            ${meta}
            <div class="text-base leading-relaxed break-words">${msg.content}</div>
          </div>
        </li>
      `;
			return content;
		}).join('');

		if (isScrolledToBottom) {
			messagesListEl.scrollTop = messagesListEl.scrollHeight;
		}
	}

	function renderFriendRequests(pendingRequests: FriendRequest[])
	{
		if (!friendRequestListEl) return;
		friendRequestListEl.innerHTML = pendingRequests.length === 0
			? `<li class="text-slate-400 text-sm">${t('no_friend_requests')}</li>`
			: pendingRequests.map(req => `
				<li class="flex justify-between items-center rounded-lg p-3 bg-slate-700/30">
					<span class="text-slate-200 font-medium">${req.requester.name || req.requester.email}</span>
					<div class="flex space-x-2">
						<button data-id="${req.id}" class="accept-friend-btn bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 text-xs font-semibold rounded-md transition">${t('accept_button')}</button>
						<button data-id="${req.id}" class="reject-friend-btn bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 text-xs font-semibold rounded-md transition">${t('reject_button')}</button>
					</div>
				</li>
			`).join('');
	}

	function renderFriendList()
	{
		if (!friendListEl) return;
		const onlineFriendIds = new Set(onlineUsers.map(u => u.id));
		friendListEl.innerHTML = myFriends.length === 0
			? `<li class="text-slate-400 text-sm px-2">${t('no_friends_message')}</li>`
			: myFriends.map(friend =>
			{
				const isOnline = onlineFriendIds.has(friend.id);
				return `
					<li class="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/40 transition cursor-pointer" data-id="${friend.id}" data-name="${friend.name}">
						<a href="/profile/${friend.id}" data-link class="flex items-center gap-3">
							<span class="w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-500'}"></span>
							<span class="text-slate-200 font-medium group-hover:text-white">${friend.name}</span>
						</a>
						${isOnline ? `<button class="invite-btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition" data-invite-id="${friend.id}">${t('invite_button')}</button>` : ''}
					</li>
				`;
			}).join('');
	}

	function renderOnlineUsers()
	{
		if (!userListEl) return;
		userListEl.innerHTML = '';
		const allOption = document.createElement('li');
		allOption.textContent = t('everyone');
		allOption.dataset.id = 'all';
		allOption.dataset.name = t('everyone');
		allOption.className = 'p-3 rounded-lg hover:bg-slate-700/40 transition cursor-pointer text-slate-200 font-medium';
		userListEl.appendChild(allOption);
		onlineUsers.forEach(user =>
		{
			const item = document.createElement('li');
			item.dataset.id = String(user.id);
			item.dataset.name = user.name || user.email;
			item.className = 'group p-3 rounded-lg hover:bg-slate-700/40 transition cursor-pointer flex justify-between items-center';
			
			let userDisplayName = user.name || user.email;
			if (user.id === myId) {
				userDisplayName += ` (${t('you')})`;
			}
			const userLink = `<a href="/profile/${user.id}" data-link class="text-slate-200 font-medium group-hover:text-white">${userDisplayName}</a>`;
			
			const inviteButton = user.id !== myId 
				? `<button class="invite-btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition" data-invite-id="${user.id}">${t('invite_button')}</button>`
				: '';

			item.innerHTML = `${userLink}${inviteButton}`;
			userListEl.appendChild(item);
		});
	}

	function selectRecipient(user: { id: number | 'all', name: string })
	{
		selectedRecipient = user;
		if (recipientInfoEl) recipientInfoEl.textContent = user.name || t('everyone');

		const chatInput = document.getElementById('chat-input') as HTMLInputElement | null;
		const chatSubmitBtn = document.querySelector('#chat-form button[type="submit"]') as HTMLButtonElement | null;

		if (user.id === myId) {
			if (chatInput) {
				chatInput.disabled = true;
				chatInput.placeholder = t('cannot_message_yourself');
			}
			if (chatSubmitBtn) {
				chatSubmitBtn.disabled = true;
				chatSubmitBtn.classList.add('opacity-50', 'cursor-not-allowed');
			}
		} else {
			if (chatInput) {
				chatInput.disabled = false;
				chatInput.placeholder = t('chat_placeholder');
			}
			if (chatSubmitBtn) {
				chatSubmitBtn.disabled = false;
				chatSubmitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
			}
		}

		// Clear previous selection highlight and set new with ring
		document.querySelectorAll('#user-list li, #friend-list li').forEach(li => {
			li.classList.remove('bg-slate-700/60');
		});
		const match = document.querySelector<HTMLElement>(`#user-list li[data-id="${user.id}"], #friend-list li[data-id="${user.id}"]`);
		if (match) {
			match.classList.add('bg-slate-700/60');
		}
	}

	async function refreshAllLists()
	{
		try
		{
			const { friends, pendingRequests } = await getFriends();
			myFriends = friends;
			renderFriendRequests(pendingRequests);
			socket?.emit('requestUserList');
		}
		catch (error)
		{
			console.error("Listeler yenilenirken hata oluştu:", error);
		}
	}

	logoutClickListener = () =>
	{
		clearMessages();
		localStorage.removeItem('token');
		disconnectSocket();
		navigateTo('/');
	};

	chatFormSubmitListener = (e: SubmitEvent) =>
	{
		e.preventDefault();
		const chatInput = document.getElementById('chat-input') as HTMLInputElement;
		if (chatInput.value && socket)
		{
			if (selectedRecipient && selectedRecipient.id !== 'all')
				socket.emit('private message', { recipientId: selectedRecipient.id, message: chatInput.value });
			else
				socket.emit('chat message', chatInput.value);
			chatInput.value = '';
		}
	};

	appClickListener = async (event: MouseEvent) =>
	{
		const target = event.target as HTMLElement;
		const handleFriendAction = async (action: Promise<any>) =>
		{
			await action;
			await refreshAllLists();
		};

		if (target.classList.contains('accept-friend-btn'))
			handleFriendAction(respondToFriendRequest(parseInt(target.dataset.id!), true));
		else if (target.classList.contains('reject-friend-btn'))
			handleFriendAction(respondToFriendRequest(parseInt(target.dataset.id!), false));
		else if (target.classList.contains('invite-btn'))
		{
			const recipientId = parseInt(target.dataset.inviteId!, 10);
			if (socket && recipientId)
			{
				socket.emit('invite_to_game', { recipientId });
				showToast(t('invitation_sent'));
			}
		}
		else
		{
			const userLi = target.closest<HTMLElement>('#friend-list li, #user-list li');
			if (userLi && !target.closest('a') && !target.closest('button'))
			{
				const id = userLi.dataset.id === 'all' ? 'all' : parseInt(userLi.dataset.id!);
				const name = userLi.dataset.name || userLi.querySelector('a')?.textContent || t('everyone');
				selectRecipient({ id, name });
			}
		}
	};

	document.getElementById('logout-button')?.addEventListener('click', logoutClickListener);
	document.getElementById('chat-form')?.addEventListener('submit', chatFormSubmitListener);
	document.getElementById('app')?.addEventListener('click', appClickListener);

	socket.on('update user list', (users: OnlineUser[]) =>
	{
		onlineUsers = users;
		renderFriendList();
		renderOnlineUsers();
		const currentRecipientStillOnline = selectedRecipient && selectedRecipient.id !== 'all' 
			? onlineUsers.some(u => u.id === selectedRecipient!.id) : true;
		if (!currentRecipientStillOnline)
			selectRecipient({ id: 'all', name: t('everyone') });
	});

	socket.on('chat message', (msg: any) =>
	{
		addMessage(msg as ChatMessage);
		renderMessages();
	});

	socket.on('chat_error', (data) => alert(data.message));
	socket.on('friendship_updated', refreshAllLists);

	renderMessages();
	refreshAllLists();
}

export function cleanup()
{
	console.log("%c--- DashboardPage CLEANUP ---", "color: red; font-weight: bold;");
	if (socket)
	{
		socket.off('update user list');
		socket.off('chat message');
		socket.off('friendship_updated');
		socket.off('chat_error');
	}

	const appElement = document.getElementById('app');
	if (appClickListener)
	{
		appElement?.removeEventListener('click', appClickListener);
		appClickListener = null;
	}
	if (logoutClickListener)
	{
		document.getElementById('logout-button')?.removeEventListener('click', logoutClickListener);
		logoutClickListener = null;
	}
	if (chatFormSubmitListener)
	{
		document.getElementById('chat-form')?.removeEventListener('submit', chatFormSubmitListener);
		chatFormSubmitListener = null;
	}
}