// frontend/src/pages/TournamentLobbyPage.ts

import { navigateTo } from '../router';
import { t } from '../i18n';
import { getSocket } from '../socket';
// DEĞİŞİKLİK: API fonksiyonunu merkezi dosyadan import ediyoruz.
import { getTournamentDetails } from '../api/tournaments';

interface TournamentPlayer {
    user: {
        id: number;
        name: string;
    };
    isReady: boolean;
}

// DEĞİŞİKLİK: Bu sayfadaki yerel 'getTournamentDetails' fonksiyonu kaldırıldı.

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 p-8">
        <h1 id="lobby-title" class="text-3xl font-bold mb-6 text-center">${t('tournament_lobby_title')}</h1>
        <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-xl font-semibold mb-4">${t('tournament_players_title')}</h2>
            <ul id="lobby-player-list" class="space-y-2 mb-4">
                <p>${t('loading_history')}...</p>
            </ul>
            <div id="lobby-actions" class="mt-4">
                </div>
            <a href="/tournaments" data-link class="block text-center mt-6 text-blue-500 hover:text-blue-700">${t('back_to_tournaments')}</a>
        </div>
    </div>
  `;
}

export async function afterRender() {
    const playerListEl = document.getElementById('lobby-player-list');
    const pathParts = window.location.pathname.split('/');
    const tournamentId = pathParts[2];
    const socket = getSocket();

    if (socket && tournamentId) {
        socket.emit('join_tournament_lobby', { tournamentId });
    }

    if (!tournamentId || !playerListEl) {
        navigateTo('/tournaments');
        return;
    }

    const renderPlayerList = async () => {
        try {
            // Artık import ettiğimiz merkezi 'getTournamentDetails' fonksiyonunu kullanıyoruz.
            const tournament = await getTournamentDetails(tournamentId);
            if (!tournament) {
                 playerListEl.innerHTML = `<p class="text-red-500">Turnuva bulunamadı veya yüklenemedi.</p>`;
                 return;
            }

            // Oyuncu listesini render et
            playerListEl.innerHTML = tournament.players.map((p: TournamentPlayer) => `
                <li class="p-2 bg-gray-200 rounded flex justify-between items-center">
                    <span>${p.user.name}</span>
                    <span class="${p.isReady ? 'text-green-500' : 'text-yellow-500'} font-bold">
                        ${p.isReady ? t('status_ready') : t('status_waiting')}
                    </span>
                </li>
            `).join('');

        } catch (error) {
            playerListEl.innerHTML = '<p class="text-red-500">Oyuncu listesi yüklenemedi.</p>';
        }
    };
    
    await renderPlayerList();
    
    if (socket) {
        socket.on('tournament_lobby_updated', () => {
            console.log('Lobi güncellendi, oyuncu listesi yenileniyor...');
            renderPlayerList();
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
    }
}