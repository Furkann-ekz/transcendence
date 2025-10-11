import { navigateTo } from "../router";
import { t } from '../i18n';
import { getMyActiveTournament } from "../api/tournaments";
import { jwt_decode } from '../utils';

export function render()
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
		<main class="flex-grow flex items-center justify-center">
			<div class="bg-[#272A33] p-8 rounded-xl shadow-lg w-full max-w-md text-center">
				<h2 class="text-2xl font-bold mb-6 text-white">${t('lobby_title')}</h2>
				
				<div id="lobby-buttons-container" class="flex flex-col space-y-4">
					<a href="/tournaments" data-link class="w-full inline-flex items-center justify-center rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 px-5 transition">
					${t('tournaments_button')}
					</a>
					<a href="/local-game" data-link class="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-5 transition">
					${t('play_local_button')}
					</a>
					<a href="/online-lobby" data-link class="w-full inline-flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-5 transition">
					${t('play_online_button')}
					</a>
					<a href="/game-settings" data-link class="w-full inline-flex items-center justify-center rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-semibold py-3 px-5 transition">
					${t('game_settings') || 'Game Settings'}
					</a>
				</div>

				<a href="/dashboard" data-link class="mt-8 inline-block font-medium text-indigo-400 hover:text-indigo-300 transition">
					${t('return_to_chat')}
				</a>
			</div>
		</main>
	</div>
	`;
}

let onlineButtonHandler: ((e: Event) => void) | null = null;
let logoutClickListener: (() => void) | null = null;

export async function afterRender()
{
	onlineButtonHandler = (e: Event) =>
	{
		e.preventDefault();
		navigateTo('/online-lobby');
	};
	document.querySelector('a[href="/online-lobby"]')?.addEventListener('click', onlineButtonHandler);

	logoutClickListener = () => {
		localStorage.removeItem('token');
		navigateTo('/');
	};
	document.getElementById('logout-button')?.addEventListener('click', logoutClickListener);

	const buttonsContainer = document.getElementById('lobby-buttons-container');
	if (!buttonsContainer)
		return ;

	try
	{
		const activeTournament = await getMyActiveTournament();

		if (activeTournament && activeTournament.status === 'LOBBY')
		{
			const returnButton = document.createElement('a');
			returnButton.setAttribute('data-link', '');
			returnButton.href = `/tournaments/${activeTournament.id}`;
			returnButton.className = 'w-full inline-flex items-center justify-center rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 px-5 transition';
			returnButton.textContent = t('return_to_tournament_lobby');
			buttonsContainer.prepend(returnButton);
		}
	}
	catch (error)
	{
		console.error("Failed to check for active tournament:", error);
	}
}

export function cleanup()
{
	if (onlineButtonHandler)
	{
		document.querySelector('a[href="/online-lobby"]')?.removeEventListener('click', onlineButtonHandler);
		onlineButtonHandler = null;
	}
	if (logoutClickListener) {
		document.getElementById('logout-button')?.removeEventListener('click', logoutClickListener);
		logoutClickListener = null;
	}
}