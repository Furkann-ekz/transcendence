// frontend/src/pages/TournamentLobbyPage.ts

import { navigateTo } from '../router';
import { t } from '../i18n';

// --- YENİ EKLENDİ: Veri tiplerini tanımlıyoruz ---
interface TournamentPlayer {
    user: {
        name: string;
    };
    isReady: boolean;
}

// --- DEĞİŞİKLİK: 'id' parametresine 'string' tipi eklendi ---
async function getTournamentDetails(id: string) {
    const response = await fetch(`/api/tournaments/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Turnuva detayları alınamadı.');
    return response.json();
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
            <a href="/tournaments" data-link class="text-blue-500 hover:text-blue-700">${t('back_to_tournaments')}</a>
        </div>
    </div>
  `;
}

export async function afterRender() {
    const playerListEl = document.getElementById('lobby-player-list');
    const pathParts = window.location.pathname.split('/');
    const tournamentId = pathParts[2];

    if (!tournamentId || !playerListEl) {
        navigateTo('/tournaments');
        return;
    }
    
    try {
        const tournament = await getTournamentDetails(tournamentId);
        // --- DEĞİŞİKLİK: 'p' parametresine 'TournamentPlayer' tipi eklendi ---
        playerListEl.innerHTML = tournament.players.map((p: TournamentPlayer) => `
            <li class="p-2 bg-gray-200 rounded">
                ${p.user.name}
            </li>
        `).join('');
    } catch (error) {
        playerListEl.innerHTML = '<p class="text-red-500">Oyuncu listesi yüklenemedi.</p>';
    }
}