// frontend/src/pages/TournamentFlowPage.ts

import { t } from '../i18n';
import { getSocket } from '../socket';
import { getTournamentDetails } from '../api/tournaments';
import { navigateTo } from '../router';

interface TournamentPlayer {
    user: { id: number; name: string; avatarUrl: string | null; };
    isEliminated: boolean;
}

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-900 text-white p-8">
        <h1 class="text-4xl font-bold mb-4 text-center">🏆 Tournament In Progress 🏆</h1>
        
        <div class="text-center mb-4">
            <button id="leave-tournament-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm">
                ${t('leave_tournament')}
            </button>
        </div>

        <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="md:col-span-1 bg-gray-800 p-6 rounded-lg">
                <h2 class="text-2xl font-semibold mb-4 border-b border-gray-600 pb-2">${t('players')}</h2>
                <ul id="tournament-players-list" class="space-y-3"></ul>
            </div>
            <div class="md:col-span-2 bg-gray-800 p-6 rounded-lg">
                <h2 class="text-2xl font-semibold mb-4 border-b border-gray-600 pb-2">Match Status</h2>
                <div id="match-status-container" class="text-center text-xl">
                    <p>Waiting for the next match to be announced...</p>
                </div>
            </div>
        </div>

        <div id="leave-confirm-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 items-center justify-center z-50">
            <div class="bg-gray-800 p-8 rounded-lg shadow-xl text-center max-w-sm">
                <p class="text-lg mb-6">${t('leave_tournament_confirm')}</p>
                <div class="flex justify-center space-x-4">
                    <button id="cancel-leave-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded">
                        ${t('cancel_button')}
                    </button>
                    <button id="confirm-leave-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded">
                        ${t('leave_button')}
                    </button>
                </div>
            </div>
        </div>
    </div>
  `;
}

export async function afterRender() {
    const socket = getSocket();
    const pathParts = window.location.pathname.split('/');
    const tournamentId = pathParts[2];

    const playersListEl = document.getElementById('tournament-players-list');
    const matchStatusEl = document.getElementById('match-status-container');

    const leaveBtn = document.getElementById('leave-tournament-btn');
    const modal = document.getElementById('leave-confirm-modal');
    const cancelBtn = document.getElementById('cancel-leave-btn');
    const confirmBtn = document.getElementById('confirm-leave-btn');

    if (!tournamentId || !socket) {
        navigateTo('/lobby');
        return;
    }

    const updatePlayerList = (players: TournamentPlayer[]) => {
        if (!playersListEl) return;
        playersListEl.innerHTML = players.map(p => `
            <li class="flex items-center p-2 rounded ${p.isEliminated ? 'bg-red-900 opacity-50' : 'bg-gray-700'}">
                <div style="background-image: url(${p.user.avatarUrl || '/default-avatar.png'})" class="w-10 h-10 rounded-full mr-4 border-2 ${p.isEliminated ? 'border-red-700' : 'border-blue-400'} bg-cover bg-center bg-gray-600"></div>
                <span class="font-medium ${p.isEliminated ? 'line-through' : ''}">${p.user.name}</span>
            </li>
        `).join('');
    };

    leaveBtn?.addEventListener('click', () => {
        modal?.classList.remove('hidden');
        modal?.classList.add('flex');
    });
    cancelBtn?.addEventListener('click', () => {
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
    });
    confirmBtn?.addEventListener('click', () => {
        socket.emit('leave_tournament', { tournamentId });
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
        navigateTo('/dashboard');
    });
    
    try {
        const initialTournament = await getTournamentDetails(tournamentId);
        updatePlayerList(initialTournament.players);
    } catch (error) {
        console.error("Could not fetch initial tournament state:", error);
    }

    socket.on('tournament_update', (data) => {
        updatePlayerList(data.players);
    });

    socket.on('new_match_starting', (data) => {
        if (matchStatusEl) {
            matchStatusEl.innerHTML = `
                <p class="mb-4">Next Match:</p>
                <div class="flex justify-center items-center space-x-8">
                    <span class="text-2xl font-bold text-blue-400">${data.player1.name}</span>
                    <span class="text-gray-400 text-lg">vs</span>
                    <span class="text-2xl font-bold text-red-400">${data.player2.name}</span>
                </div>
                <div id="countdown-timer" class="text-6xl font-bold mt-8"></div>
            `;
        }
    });

    socket.on('match_countdown', (data) => {
        const countdownTimerEl = document.getElementById('countdown-timer');
        if (countdownTimerEl) {
            countdownTimerEl.textContent = data.secondsLeft > 0 ? data.secondsLeft.toString() : "GO!";
        }
    });

    // BU SATIR ÖNEMLİ: Sadece yönlendirme yapıyor.
    socket.on('gameStart', () => {
        console.log("Maç başlıyor sinyali alındı! Oyun ekranına yönlendiriliyor...");
        navigateTo('/online-game');
    });

    socket.on('tournament_finished', (data) => {
        if (matchStatusEl) {
            matchStatusEl.innerHTML = `
                <p class="text-3xl font-bold text-yellow-400">Winner is ${data.winner.name}!</p>
                <a href="/lobby" data-link class="mt-4 inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                    Return to Lobby
                </a>
            `;
        }
    });
}

export function cleanup() {
    const socket = getSocket();
    if (socket) {
        socket.off('tournament_update');
        socket.off('new_match_starting');
        socket.off('tournament_finished');
        socket.off('match_countdown');
        socket.off('gameStart');
    }
}