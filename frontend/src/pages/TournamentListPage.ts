import { navigateTo } from '../router';
import { t } from '../i18n';
import { jwt_decode } from '../utils';
import { getSocket } from '../socket';
import { getTournaments, joinTournament, createTournament } from '../api/tournaments'; 

interface TournamentSummary
{
	id: string;
	name: string;
	host: { id: number; name: string; };
	_count: { players: number; };
	players: { userId: number }[]; 
}

let createBtnHandler: (() => Promise<void>) | null = null;
let tournamentListClickHandler: ((e: Event) => void) | null = null;
let logoutClickListener: (() => void) | null = null;

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
		<main class="flex-grow flex flex-col items-center p-4 overflow-auto">
			<div class="w-full max-w-4xl">
				<div class="flex justify-between items-center mb-6">
					<h1 class="text-3xl font-bold text-white">${t('tournaments_title')}</h1>
					<button id="create-tournament-btn" class="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-5 transition">
						${t('create_new_tournament')}
					</button>
				</div>
				<div id="tournament-list" class="space-y-4">
					<p class="text-center text-slate-400">${t('loading_history')}...</p>
				</div>
				<a href="/lobby" data-link class="block text-center mt-8 font-medium text-indigo-400 hover:text-indigo-300 transition">${t('back_to_main_lobby')}</a>
			</div>
		</main>
	</div>
  `;
}

export async function afterRender()
{
	const listEl = document.getElementById('tournament-list');
	const token = localStorage.getItem('token');
	const myId = token ? jwt_decode(token).userId : null;
	const socket = getSocket();

	const renderList = async () =>
	{
		if (!listEl)
			return ;
		try
		{
			const tournaments: TournamentSummary[] = await getTournaments();
			if (tournaments.length === 0)
			{
				listEl.innerHTML = `<p class="text-center text-slate-400">${t('no_active_tournaments')}</p>`;
				return ;
			}
			listEl.innerHTML = tournaments.map((tournament) =>
			{
				const isPlayerJoined = tournament.players.some(p => p.userId === myId);
				return `
				<div class="bg-[#272A33] p-4 rounded-xl shadow-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
					<div class="flex-grow">
						<a href="/tournaments/${tournament.id}" data-link class="text-xl font-bold text-white hover:text-indigo-400 block">
							${tournament.name}
						</a>
						<p class="text-sm text-slate-400 mt-1">${t('tournament_host')}: ${tournament.host.name}</p>
						<p class="text-sm text-slate-400">${t('players')}: ${tournament._count.players}/8</p>
					</div>
					<button 
						data-tournament-id="${tournament.id}" 
						class="register-btn ${isPlayerJoined ? 'bg-slate-500 text-slate-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'} text-white font-semibold py-2 px-5 rounded-lg transition w-full sm:w-auto"
						${isPlayerJoined ? 'disabled' : ''}
					>
						${isPlayerJoined ? t('registered_button_tournament') : t('register_button_tournament')}
					</button>
				</div>
			`;
			}).join('');
		}
		catch (error)
		{
			listEl.innerHTML = `<p class="text-red-500 text-center">${t('tournaments_load_error')}</p>`;
		}
	};

	createBtnHandler = async () =>
	{
		try
		{
			const newTournament = await createTournament();
			navigateTo(`/tournaments/${newTournament.id}`);
		}
		catch (error: any)
		{
			alert(t(error.message));
		}
	};

	tournamentListClickHandler = async (e: Event) =>
	{
		const target = e.target as HTMLElement;
		const registerButton = target.closest('.register-btn') as HTMLButtonElement;
		
		if (!registerButton)
			return ;

		const tournamentId = registerButton.dataset.tournamentId;
		if (!tournamentId || registerButton.disabled)
			return ;

		try
		{
			await joinTournament(tournamentId);
		}
		catch (error: any)
		{
			alert(t(error.message)); 
		}
	};
	
	logoutClickListener = () => {
		localStorage.removeItem('token');
		navigateTo('/');
	};
	document.getElementById('logout-button')?.addEventListener('click', logoutClickListener);

	document.getElementById('create-tournament-btn')?.addEventListener('click', createBtnHandler);
	listEl?.addEventListener('click', tournamentListClickHandler);

	await renderList();
	socket?.on('tournament_list_updated', renderList);
}

export function cleanup()
{
	console.log("%c--- TournamentListPage CLEANUP ---", "color: purple; font-weight: bold;");
	const socket = getSocket();
	if (socket)
		socket.off('tournament_list_updated');
	if (createBtnHandler)
	{
		document.getElementById('create-tournament-btn')?.removeEventListener('click', createBtnHandler);
		createBtnHandler = null;
	}
	if (tournamentListClickHandler)
	{
		document.getElementById('tournament-list')?.removeEventListener('click', tournamentListClickHandler);
		tournamentListClickHandler = null;
	}
	if (logoutClickListener) {
		document.getElementById('logout-button')?.removeEventListener('click', logoutClickListener);
		logoutClickListener = null;
	}
}