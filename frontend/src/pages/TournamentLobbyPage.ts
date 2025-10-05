// frontend/src/pages/TournamentLobbyPage.ts

import { navigateTo } from '../router';
import { t } from '../i18n';
import { getSocket } from '../socket';
import { jwt_decode } from '../utils';
import { getTournamentDetails, setReadyStatus, startTournament, leaveTournament, joinTournament } from '../api/tournaments';

interface TournamentPlayer {
    user: {
        id: number;
        name: string;
    };
    isReady: boolean;
}

interface TournamentDetails {
    id: string;
    name: string;
    hostId: number;
    players: TournamentPlayer[];
}

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 p-8">
        <h1 id="lobby-title" class="text-3xl font-bold mb-6 text-center">${t('tournament_lobby_title')}</h1>
        <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-xl font-semibold mb-4">${t('tournament_players_title')}</h2>
            <ul id="lobby-player-list" class="space-y-2 mb-4">
                <p>${t('loading_history')}...</p>
            </ul>
            <div id="lobby-actions" class="mt-6 border-t pt-4 space-y-2">
                </div>
            <a href="/tournaments" data-link class="block text-center mt-6 text-blue-500 hover:text-blue-700">${t('back_to_tournaments')}</a>
        </div>
    </div>
  `;
}

export async function afterRender() {
    const playerListEl = document.getElementById('lobby-player-list');
    const actionsEl = document.getElementById('lobby-actions');
    const titleEl = document.getElementById('lobby-title');

    const pathParts = window.location.pathname.split('/');
    const tournamentId = pathParts[2];
    const socket = getSocket();
    const token = localStorage.getItem('token');
    const myId = token ? jwt_decode(token).userId : null;

    if (socket && tournamentId) {
        socket.emit('join_tournament_lobby', { tournamentId });
    }

    if (!tournamentId || !playerListEl || !actionsEl || !myId) {
        navigateTo('/tournaments');
        return;
    }

    const renderLobby = async () => {
        try {
            const tournament: TournamentDetails = await getTournamentDetails(tournamentId);
            
            if (titleEl) titleEl.textContent = tournament.name;

            playerListEl.innerHTML = tournament.players.map((p: TournamentPlayer) => `
                <li class="p-2 bg-gray-200 rounded flex justify-between items-center">
                    <span>${p.user.name} ${p.user.id === myId ? t('you_suffix') : ''} ${p.user.id === tournament.hostId ? '(Host)' : ''}</span>
                    <span class="${p.isReady ? 'text-green-500' : 'text-yellow-500'} font-bold">
                        ${p.isReady ? t('status_ready') : t('status_waiting')}
                    </span>
                </li>
            `).join('');

            actionsEl.innerHTML = ''; // Önceki butonları temizle

            const amIHost = tournament.hostId === myId;
            const amIPlayer = tournament.players.some(p => p.user.id === myId);

            if (amIHost) {
                // --- KURUCU İÇİN BUTONLAR ---
                const meAsPlayer = tournament.players.find(p => p.user.id === myId)!;
                const readyButton = document.createElement('button');
                readyButton.textContent = meAsPlayer.isReady ? t('not_ready_button') : t('ready_button');
                readyButton.className = `w-full font-bold py-2 px-4 rounded ${meAsPlayer.isReady ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white`;
                readyButton.onclick = async () => {
                    try { await setReadyStatus(tournamentId, !meAsPlayer.isReady); } 
                    catch (error: any) { alert(error.message); }
                };
                actionsEl.appendChild(readyButton);

                const canStart = tournament.players.length >= 4 && tournament.players.every(p => p.isReady);
                const startButton = document.createElement('button');
                startButton.textContent = t('start_tournament_button');
                startButton.className = `w-full font-bold py-2 px-4 rounded text-white ${canStart ? 'bg-blue-500 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`;
                startButton.disabled = !canStart;
                startButton.onclick = async () => {
                    try { await startTournament(tournamentId); } 
                    catch (error: any) { alert(error.message); }
                };
                actionsEl.appendChild(startButton);

            } else if (amIPlayer) {
                // --- OYUNCU İÇİN BUTONLAR ---
                const meAsPlayer = tournament.players.find(p => p.user.id === myId)!;
                const readyButton = document.createElement('button');
                readyButton.textContent = meAsPlayer.isReady ? t('not_ready_button') : t('ready_button');
                readyButton.className = `w-full font-bold py-2 px-4 rounded ${meAsPlayer.isReady ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white`;
                readyButton.onclick = async () => {
                    try { await setReadyStatus(tournamentId, !meAsPlayer.isReady); } 
                    catch (error: any) { alert(error.message); }
                };
                actionsEl.appendChild(readyButton);

                const leaveButton = document.createElement('button');
                leaveButton.textContent = t('leave_tournament_lobby');
                leaveButton.className = 'w-full font-bold py-2 px-4 rounded bg-red-600 hover:bg-red-700 text-white';
                leaveButton.onclick = async () => {
                    if (confirm(t('confirm_leave_tournament_lobby'))) { // <-- Metni t() fonksiyonu ile çeviriyoruz
                        try {
                            await leaveTournament(tournamentId);
                            navigateTo('/tournaments');
                        } catch (error: any) { alert(t(error.message)); } // Buradaki alert'i de çevirelim, her ihtimale karşı.
                    }
                };
                actionsEl.appendChild(leaveButton);

            } else {
                // --- İZLEYİCİ İÇİN BUTON ---
                if (tournament.players.length < 8) {
                    const joinButton = document.createElement('button');
                    joinButton.textContent = t('join_tournament');
                    joinButton.className = 'w-full font-bold py-2 px-4 rounded bg-green-500 hover:bg-green-600 text-white';
                    joinButton.onclick = async () => {
                        try { await joinTournament(tournamentId); } 
                        catch (error: any) { alert(error.message); }
                    };
                    actionsEl.appendChild(joinButton);
                } else {
                    actionsEl.innerHTML = `<p class="text-center text-gray-500">Turnuva dolu.</p>`;
                }
            }
        } catch (error) {
            console.error(error);
            playerListEl.innerHTML = '<p class="text-red-500">Oyuncu listesi yüklenemedi.</p>';
        }
    };
    
    await renderLobby();
    
    if (socket) {
        socket.on('tournament_lobby_updated', renderLobby);
        socket.on('tournament_started', ({ tournament }) => {
            navigateTo(`/tournament/${tournament.id}/play`);
        });
    }
}

export function cleanup() {
    const socket = getSocket();
    const pathParts = window.location.pathname.split('/');
    const tournamentId = pathParts[2];
    if (socket && tournamentId) {
        socket.emit('leave_tournament_lobby', { tournamentId });
        socket.off('tournament_lobby_updated');
        socket.off('tournament_started');
    }
}