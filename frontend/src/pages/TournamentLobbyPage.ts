import { navigateTo } from '../router';
import { t } from '../i18n';
import { getSocket } from '../socket';
import { jwt_decode } from '../utils';
import { getTournamentDetails, setReadyStatus, startTournament, leaveTournament, joinTournament, deleteTournament } from '../api/tournaments';

interface TournamentPlayer
{
	user:
	{
		id: number;
		name: string;
	};
	isReady: boolean;
}

interface TournamentDetails
{
	id: string;
	name: string;
	hostId: number;
	players: TournamentPlayer[];
}

export function render(): string
{
  return `
	<div class="h-screen w-screen flex flex-col items-center justify-center bg-[#171A21] text-slate-100 p-4">
		<div class="bg-[#272A33] p-8 rounded-xl shadow-lg w-full max-w-md">
			<h1 id="lobby-title" class="text-3xl font-bold mb-6 text-center text-white">${t('tournament_lobby_title')}</h1>
			<h2 class="text-xl font-semibold mb-4 text-white">${t('tournament_players_title')}</h2>
			<ul id="lobby-player-list" class="space-y-3 mb-6">
				<p class="text-slate-400">${t('loading_history')}...</p>
			</ul>
			<div id="lobby-actions" class="border-t border-slate-700/50 pt-6 space-y-3">
			</div>
			<a href="/tournaments" data-link class="block text-center mt-8 font-medium text-indigo-400 hover:text-indigo-300 transition">${t('back_to_tournaments')}</a>
		</div>
	</div>
  `;
}

export async function afterRender()
{
	const playerListEl = document.getElementById('lobby-player-list');
	const actionsEl = document.getElementById('lobby-actions');
	const titleEl = document.getElementById('lobby-title');

	const pathParts = window.location.pathname.split('/');
	const tournamentId = pathParts[2];
	const socket = getSocket();
	const token = localStorage.getItem('token');
	const myId = token ? jwt_decode(token).userId : null;

	if (socket && tournamentId)
		socket.emit('join_tournament_lobby', { tournamentId });

	if (!tournamentId || !playerListEl || !actionsEl || !myId)
	{
		navigateTo('/tournaments');
		return ;
	}

	const renderLobby = async () =>
	{
		try
		{
			const tournament: TournamentDetails = await getTournamentDetails(tournamentId);
			
			if (titleEl)
				titleEl.textContent = tournament.name;

			playerListEl.innerHTML = tournament.players.map((p: TournamentPlayer) => `
				<li class="p-3 bg-slate-800 rounded-lg flex justify-between items-center">
					<span class="font-medium text-slate-200">${p.user.name} ${p.user.id === myId ? t('you_suffix') : ''} ${p.user.id === tournament.hostId ? '(Host)' : ''}</span>
					<span class="${p.isReady ? 'text-green-400' : 'text-yellow-400'} font-bold text-sm">
						${p.isReady ? t('status_ready') : t('status_waiting')}
					</span>
				</li>
			`).join('');

			actionsEl.innerHTML = '';

			const amIHost = tournament.hostId === myId;
			const amIPlayer = tournament.players.some(p => p.user.id === myId);

			if (amIHost)
			{
				const meAsPlayer = tournament.players.find(p => p.user.id === myId)!;
				const readyButton = document.createElement('button');
				readyButton.textContent = meAsPlayer.isReady ? t('not_ready_button') : t('ready_button');
				readyButton.className = `w-full inline-flex items-center justify-center rounded-lg font-semibold py-2 px-5 transition ${meAsPlayer.isReady ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-green-600 hover:bg-green-500 text-white'}`;
				readyButton.onclick = async () =>
				{
					try
					{
						await setReadyStatus(tournamentId, !meAsPlayer.isReady);
					} 
					catch (error: any)
					{
						alert(error.message);
					}
				};
				actionsEl.appendChild(readyButton);

				const canStart = tournament.players.length >= 4 && tournament.players.every(p => p.isReady);
				const startButton = document.createElement('button');
				startButton.textContent = t('start_tournament_button');
				startButton.className = `w-full inline-flex items-center justify-center rounded-lg font-semibold py-2 px-5 transition text-white ${canStart ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-500 cursor-not-allowed'}`;
				startButton.disabled = !canStart;
				startButton.onclick = async () =>
				{
					try
					{
						await startTournament(tournamentId);
					} 
					catch (error: any)
					{
						alert(error.message);
					}
				};
				actionsEl.appendChild(startButton);

				const deleteButton = document.createElement('button');
				deleteButton.textContent = t('delete_tournament') || 'Delete Tournament';
				deleteButton.className = 'w-full inline-flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 transition';
				deleteButton.onclick = async () =>
				{
					if (confirm(t('confirm_delete_tournament') || 'Are you sure you want to delete this tournament? All players will be removed.'))
					{
						try
						{
							await deleteTournament(tournamentId);
							navigateTo('/tournaments');
						} 
						catch (error: any)
						{
							alert(error.message);
						}
					}
				};
				actionsEl.appendChild(deleteButton);

			}
			else if (amIPlayer)
			{
				const meAsPlayer = tournament.players.find(p => p.user.id === myId)!;
				const readyButton = document.createElement('button');
				readyButton.textContent = meAsPlayer.isReady ? t('not_ready_button') : t('ready_button');
				readyButton.className = `w-full inline-flex items-center justify-center rounded-lg font-semibold py-2 px-5 transition ${meAsPlayer.isReady ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-green-600 hover:bg-green-500 text-white'}`;
				readyButton.onclick = async () =>
				{
					try
					{
						await setReadyStatus(tournamentId, !meAsPlayer.isReady);
					} 
					catch (error: any)
					{
						alert(error.message);
					}
				};
				actionsEl.appendChild(readyButton);

				const leaveButton = document.createElement('button');
				leaveButton.textContent = t('leave_tournament_lobby');
				leaveButton.className = 'w-full inline-flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 transition';
				leaveButton.onclick = async () =>
					{
					if (confirm(t('confirm_leave_tournament_lobby')))
					{
						try
						{
							await leaveTournament(tournamentId);
							navigateTo('/tournaments');
						} catch (error: any)
						{
							alert(t(error.message));
						}
					}
				};
				actionsEl.appendChild(leaveButton);

			}
			else
			{
				if (tournament.players.length < 8)
				{
					const joinButton = document.createElement('button');
					joinButton.textContent = t('join_tournament');
					joinButton.className = 'w-full inline-flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-5 transition';
					joinButton.onclick = async () =>
					{
						try
						{
							await joinTournament(tournamentId);
						} 
						catch (error: any)
						{
							alert(error.message);
						}
					};
					actionsEl.appendChild(joinButton);
				}
				else
					actionsEl.innerHTML = `<p class="text-center text-slate-400">Turnuva dolu.</p>`;
			}
		}
		catch (error)
		{
			console.error(error);
			playerListEl.innerHTML = '<p class="text-red-500 text-center">Oyuncu listesi yüklenemedi.</p>';
		}
	};
	
	await renderLobby();
	
	if (socket)
	{
		socket.on('tournament_lobby_updated', renderLobby);
		socket.on('tournament_started', ({ tournament }) =>
		{
			navigateTo(`/tournament/${tournament.id}/play`);
		});
		
		socket.on('tournament_deleted', () =>
		{
			alert(t('tournament_deleted_message') || 'The tournament has been deleted by the host.');
			navigateTo('/tournaments');
		});
	}
}

export function cleanup()
{
	const socket = getSocket();
	const pathParts = window.location.pathname.split('/');
	const tournamentId = pathParts[2];
	if (socket && tournamentId)
	{
		socket.emit('leave_tournament_lobby', { tournamentId });
		socket.off('tournament_lobby_updated');
		socket.off('tournament_started');
		socket.off('tournament_deleted');
	}
	const actionsEl = document.getElementById('lobby-actions');
	if (actionsEl)
		actionsEl.innerHTML = '';
}