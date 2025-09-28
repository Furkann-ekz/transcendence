// frontend/src/pages/TournamentLobbyPage.ts

import { getSocket } from '../socket';
import { navigateTo } from '../router';
import type { Socket } from 'socket.io-client';

let socket: Socket | null = null;
let tournamentId: string | null = null;

function renderPlayerList(players: any[]) {
    const listEl = document.getElementById('lobby-player-list');
    if (!listEl) return;
    listEl.innerHTML = players.map(p => `
        <li class="p-2 ${p.isReady ? 'bg-green-200' : 'bg-gray-200'} rounded">
            ${p.user.name} ${p.isReady ? '(Hazır)' : ''}
        </li>
    `).join('');
}

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 p-8">
        <h1 id="lobby-title" class="text-3xl font-bold mb-6 text-center">Turnuva Lobisi</h1>
        <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-xl font-semibold mb-4">Oyuncular</h2>
            <ul id="lobby-player-list" class="space-y-2 mb-4">
                </ul>
            <button id="ready-btn" class="w-full bg-yellow-500 text-white font-bold py-2 px-4 rounded mb-2">Hazırım</button>
            <a href="/tournaments" data-link class="text-blue-500 hover:text-blue-700">Lobilere Geri Dön</a>
        </div>
    </div>
  `;
}

export function afterRender() {
    socket = getSocket();
    const pathParts = window.location.pathname.split('/');
    tournamentId = pathParts[2];

    const readyBtn = document.getElementById('ready-btn') as HTMLButtonElement;
    let isReady = false; // Oyuncunun kendi hazır olma durumunu takip etmek için

    if (!tournamentId || !socket) {
        navigateTo('/tournaments');
        return;
    }
    
    // Bu odaya abone ol
    socket.emit('tournament:subscribe', tournamentId);

    // Sunucudan gelen durum güncellemelerini dinle
    socket.on('tournament:stateUpdate', (tournamentState) => {
        console.log('Turnuva durumu güncellendi:', tournamentState);
        renderPlayerList(tournamentState.players);
    });

    readyBtn?.addEventListener('click', () => {
        isReady = !isReady; // Durumu tersine çevir
        socket?.emit('tournament:setReady', {
            tournamentId: tournamentId,
            isReady: isReady
        });

        // Butonun görünümünü anında güncelle
        readyBtn.textContent = isReady ? 'Hazır Değil' : 'Hazırım';
        readyBtn.classList.toggle('bg-green-500', isReady);
        readyBtn.classList.toggle('bg-yellow-500', !isReady);
    });
}

export function cleanup() {
    if (socket && tournamentId) {
        // Odadan aboneliği kaldır
        socket.emit('tournament:unsubscribe', tournamentId);
        socket.off('tournament:stateUpdate');
    }
}