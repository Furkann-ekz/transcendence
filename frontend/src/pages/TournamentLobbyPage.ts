// frontend/src/pages/TournamentLobbyPage.ts

import { navigateTo } from '../router';
import { t } from '../i18n';
import { getSocket } from '../socket';

// Tip tanımlamaları doğru.
interface TournamentPlayer {
    user: {
        name: string;
    };
    isReady: boolean;
}

async function getTournamentDetails(id: string) {
    const response = await fetch(`/api/tournaments/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Turnuva detayları alınamadı.');
    return response.json();
}

// Render fonksiyonu doğru.
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

// afterRender fonksiyonunun DÜZELTİLMİŞ hali.
export async function afterRender() {
    const playerListEl = document.getElementById('lobby-player-list');
    const pathParts = window.location.pathname.split('/');
    const tournamentId = pathParts[2];
    const socket = getSocket();

    // Odaya katılma sinyali doğru.
    if (socket && tournamentId) {
        socket.emit('join_tournament_lobby', { tournamentId });
    }

    if (!tournamentId || !playerListEl) {
        navigateTo('/tournaments');
        return;
    }

    // Veri çekme ve render etme mantığı bu fonksiyonda toplanmış, bu da doğru.
    const renderPlayerList = async () => {
        try {
            const tournament = await getTournamentDetails(tournamentId);
            // Düzeltme: Sunucudan gelen yanıtta tournament null ise hata yönetimi
            if (!tournament) {
                 playerListEl.innerHTML = `<p class="text-red-500">Turnuva bulunamadı veya yüklenemedi.</p>`;
                 return;
            }
            playerListEl.innerHTML = tournament.players.map((p: TournamentPlayer) => `
                <li class="p-2 bg-gray-200 rounded">
                    ${p.user.name}
                </li>
            `).join('');
        } catch (error) {
            playerListEl.innerHTML = '<p class="text-red-500">Oyuncu listesi yüklenemedi.</p>';
        }
    };
    
    // Sayfa ilk yüklendiğinde listeyi bir kez çiziyoruz.
    await renderPlayerList();
    
    // Sunucudan lobinin güncellenmesi gerektiği sinyalini dinle.
    if (socket) {
        socket.on('tournament_lobby_updated', () => {
            console.log('Lobi güncellendi, oyuncu listesi yenileniyor...');
            // Sinyal geldiğinde listeyi yeniden çiz.
            renderPlayerList();
        });
    }
}

// Cleanup fonksiyonu doğru.
export function cleanup() {
    const socket = getSocket();
    const pathParts = window.location.pathname.split('/');
    const tournamentId = pathParts[2];

    if (socket && tournamentId) {
        socket.emit('leave_tournament_lobby', { tournamentId });
        socket.off('tournament_lobby_updated');
    }
}