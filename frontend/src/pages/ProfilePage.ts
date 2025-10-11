import { t } from '../i18n';
import { 
	getUserProfile, 
	getFriendshipStatus, 
	sendFriendRequest, 
	removeFriendship, 
	respondToFriendRequest,
	blockUser,
	unblockUser
} from '../api/users';
import { jwt_decode } from '../utils';
import { navigateTo } from '../router';
import { getSocket } from '../socket';
import type { Socket } from 'socket.io-client';

let profileId: number;
let myId: number | null;
let socket: Socket | null;
let logoutClickListener: (() => void) | null = null;

async function renderActionButtons()
{
	const actionsContainer = document.getElementById('profile-actions-dynamic');
	if (!actionsContainer || !myId || profileId === myId)
		return ;

	try
	{
		const status = await getFriendshipStatus(profileId);
		let buttonsHTML = '';

		if (status.isBlocked)
			buttonsHTML += `<button id="unblock-user-btn" class="w-full inline-flex items-center justify-center rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-5 transition">${t('unblock_user_button')}</button>`;
		else if (status.friendshipStatus === 'blocked_by_them')
			buttonsHTML = `<p class="text-sm text-slate-400">Bu kullanıcıyla etkileşimde bulunamazsınız.</p>`;
		else
		{
			switch (status.friendshipStatus)
			{
				case 'none':
					buttonsHTML += `<button id="add-friend-btn" class="w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-5 transition">${t('add_friend_button')}</button>`;
					break ;
				case 'pending_sent':
					buttonsHTML += `<button id="cancel-request-btn" data-friendship-id="${status.friendshipId}" class="w-full inline-flex items-center justify-center rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-5 transition">${t('cancel_request_button')}</button>`;
					break ;
				case 'pending_received':
					buttonsHTML += `
						<p class="mb-2 text-sm text-slate-300">${t('friend_requests')}</p>
						<div class="flex space-x-2">
							<button id="accept-request-btn" data-friendship-id="${status.friendshipId}" class="w-full inline-flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 transition">${t('accept_button')}</button>
							<button id="reject-request-btn" data-friendship-id="${status.friendshipId}" class="w-full inline-flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 transition">${t('reject_button')}</button>
						</div>`;
					break ;
				case 'friends':
					buttonsHTML += `<button id="remove-friend-btn" data-friendship-id="${status.friendshipId}" class="w-full inline-flex items-center justify-center rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold py-2 px-5 transition">${t('remove_friend_button')}</button>`;
					break ;
			}
			buttonsHTML += `<button id="block-user-btn" class="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-5 transition">${t('block_user_button')}</button>`;
		}
		
		actionsContainer.innerHTML = buttonsHTML;
		attachButtonListeners();

	}
	catch (error)
	{
		console.error("Could not render action buttons:", error);
		actionsContainer.innerHTML = `<p class="text-red-500 text-sm">Aksiyonlar yüklenemedi.</p>`;
	}
}

function attachButtonListeners()
{
	document.getElementById('add-friend-btn')?.addEventListener('click', async () =>
	{ 
		await sendFriendRequest(profileId); 
		renderActionButtons();
	});
	document.getElementById('cancel-request-btn')?.addEventListener('click', async (e) =>
	{
		const id = parseInt((e.target as HTMLElement).dataset.friendshipId!);
		await removeFriendship(id); 
		renderActionButtons();
	});
	document.getElementById('accept-request-btn')?.addEventListener('click', async (e) =>
	{
		const id = parseInt((e.target as HTMLElement).dataset.friendshipId!);
		await respondToFriendRequest(id, true);
		renderActionButtons();
	});
	document.getElementById('reject-request-btn')?.addEventListener('click', async (e) =>
	{
		const id = parseInt((e.target as HTMLElement).dataset.friendshipId!);
		await respondToFriendRequest(id, false);
		renderActionButtons();
	});
	document.getElementById('remove-friend-btn')?.addEventListener('click', async (e) =>
	{
		const id = parseInt((e.target as HTMLElement).dataset.friendshipId!);
		await removeFriendship(id);
		renderActionButtons();
	});
	document.getElementById('block-user-btn')?.addEventListener('click', async () =>
	{
		await blockUser(profileId);
		renderActionButtons();
	});
	document.getElementById('unblock-user-btn')?.addEventListener('click', async () =>
	{
		await unblockUser(profileId);
		renderActionButtons();
	});
}

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
		<main class="flex-grow flex items-center justify-center p-4">
			<div id="profile-card" class="bg-[#272A33] p-8 rounded-xl shadow-lg w-full max-w-md text-center">
				<div id="profile-avatar" class="w-28 h-28 rounded-full border-4 border-slate-600 mb-4 mx-auto bg-cover bg-center bg-slate-700"></div>
				<h2 id="profile-name" class="text-3xl font-bold text-white mb-1">Loading...</h2>
				<p id="profile-created-at" class="text-slate-400 text-sm mb-6"></p>
				<div class="flex justify-center space-x-8 border-t border-b border-slate-700/50 py-4">
				<div>
					<p class="text-2xl font-bold text-green-400" id="profile-wins">-</p>
					<p class="text-sm text-slate-400">${t('profile_wins')}</p>
				</div>
				<div>
					<p class="text-2xl font-bold text-red-400" id="profile-losses">-</p>
					<p class="text-sm text-slate-400">${t('profile_losses')}</p>
				</div>
				</div>
				<div class="mt-6 space-y-3">
					<a id="match-history-link" href="#" data-link class="w-full inline-flex items-center justify-center rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-5 transition">
					${t('view_match_history')}
					</a>
					<div id="profile-actions-dynamic" class="mt-2"></div>
				</div>
				<a href="/dashboard" data-link class="mt-6 inline-block font-medium text-indigo-400 hover:text-indigo-300 transition">
				${t('return_to_chat')}
				</a>
			</div>
		</main>
	</div>
  `;
}

export async function afterRender()
{
	const avatarElement = document.getElementById('profile-avatar') as HTMLDivElement;
	const nameElement = document.getElementById('profile-name');
	const createdAtElement = document.getElementById('profile-created-at');
	const winsElement = document.getElementById('profile-wins');
	const lossesElement = document.getElementById('profile-losses');
	const matchHistoryLink = document.getElementById('match-history-link');
	const actionsContainer = document.getElementById('profile-actions-dynamic');
	const pathParts = window.location.pathname.split('/');
	profileId = parseInt(pathParts[2], 10);
	const token = localStorage.getItem('token');
	myId = token ? jwt_decode(token).userId : null;

	logoutClickListener = () => {
		localStorage.removeItem('token');
		navigateTo('/');
	};
	document.getElementById('logout-button')?.addEventListener('click', logoutClickListener);

	socket = getSocket();
	if (socket)
	{
		socket.on('friendship_updated', () =>
		{
			if (profileId !== myId)
			{
				console.log('Arkadaşlık durumu değişti, butonlar yenileniyor...');
				renderActionButtons();
			}
		});
	}

	if (isNaN(profileId) || !nameElement || !matchHistoryLink || !actionsContainer)
	{
		if (nameElement)
			nameElement.textContent = 'Geçersiz Profil';
		return ;
	}
	
	matchHistoryLink.setAttribute('href', `/profile/${profileId}/history`);

	try
	{
		const userProfile = await getUserProfile(pathParts[2]);
		nameElement.textContent = userProfile.name || 'İsimsiz Kullanıcı';
		if (createdAtElement)
			createdAtElement.textContent = `${t('profile_joined_on')} ${new Date(userProfile.createdAt).toLocaleDateString()}`;
		if (winsElement)
			winsElement.textContent = userProfile.wins.toString();
		if (lossesElement)
			lossesElement.textContent = userProfile.losses.toString();
		
		if (userProfile.avatarUrl && avatarElement)
			avatarElement.style.backgroundImage = `url(${userProfile.avatarUrl}?t=${new Date().getTime()})`;
		else if (avatarElement)
			avatarElement.style.backgroundImage = `url(/default-avatar.png)`;
		
		if (profileId === myId)
			actionsContainer.innerHTML = `<a href="/profile/edit" data-link class="w-full inline-flex items-center justify-center rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-5 transition">${t('edit_profile_button')}</a>`;
		else
			await renderActionButtons();
	}
	catch (error)
	{
		console.error("Profil verisi yüklenemedi:", error);
		nameElement.textContent = 'Profil Bulunamadı';
		navigateTo('/dashboard');
	}
}

export function cleanup()
{
	console.log("%c--- ProfilePage CLEANUP ---", "color: blue; font-weight: bold;");
	if (socket)
		socket.off('friendship_updated');
	if (logoutClickListener) {
		document.getElementById('logout-button')?.removeEventListener('click', logoutClickListener);
		logoutClickListener = null;
	}
	const actionsContainer = document.getElementById('profile-actions-dynamic');
	if (actionsContainer)
		actionsContainer.innerHTML = '';
}