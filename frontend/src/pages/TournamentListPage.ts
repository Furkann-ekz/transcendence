// frontend/src/pages/TournamentListPage.ts

import { navigateTo } from '../router';
import { t } from '../i18n';
import { jwt_decode } from '../utils';

// Tip Tanımlamaları
interface TournamentSummary {
    id: string;
    name: string;
    host: { id: number; name: string; };
    _count: { players: number; };
    players: { userId: number }[]; // Oyuncuları kontrol etmek için bu alanı da isteyeceğiz
}

async function fetchTournaments() {
    const response = await fetch('/api/tournaments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Turnuvalar yüklenemedi.');
    return response.json();
}

async function registerForTournament(tournamentId: string) {
    const response = await fetch(`/api/tournaments/${tournamentId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Turnuvaya kayıt olunamadı.');
    }
    return response.json();
}

async function createTournament() {
    const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Turnuva oluşturulamadı.');
    return response.json();
}

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 p-8">
        <h1 class="text-3xl font-bold mb-6 text-center">${t('tournaments_title')}</h1>
        <div class="max-w-4xl mx-auto">
            <div class="mb-4 text-right">
                <button id="create-tournament-btn" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    ${t('create_new_tournament')}
                </button>
            </div>
            <div id="tournament-list" class="space-y-4">
                <p>${t('loading_history')}...</p>
            </div>
             <a href="/lobby" data-link class="block text-center mt-6 text-blue-500 hover:text-blue-800">${t('back_to_main_lobby')}</a>
        </div>
    </div>
  `;
}

// frontend/src/pages/TournamentListPage.ts

export async function afterRender() {
    const listEl = document.getElementById('tournament-list');
    const createBtn = document.getElementById('create-tournament-btn');
    const token = localStorage.getItem('token');
    const myId = token ? jwt_decode(token).userId : null;

    const renderList = async () => {
        if (!listEl) return;
        try {
            const tournaments: TournamentSummary[] = await fetchTournaments();
            if (tournaments.length === 0) {
                listEl.innerHTML = `<p class="text-center text-gray-500">${t('no_active_tournaments')}</p>`;
                return;
            }
            listEl.innerHTML = tournaments.map((tournament) => {
                const isPlayerJoined = tournament.players.some(p => p.userId === myId);
                return `
                <div class="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
                    <div>
                        <a href="/tournaments/${tournament.id}" data-link class="text-xl font-bold hover:text-blue-600">
                            ${tournament.name}
                        </a>
                        <p class="text-sm text-gray-600">${t('tournament_host')}: ${tournament.host.name} | ${t('players')}: ${tournament._count.players}/8</p>
                    </div>
                    <button 
                        data-tournament-id="${tournament.id}" 
                        class="register-btn ${isPlayerJoined ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-700'} text-white font-bold py-2 px-4 rounded"
                        ${isPlayerJoined ? 'disabled' : ''}
                    >
                        ${isPlayerJoined ? t('registered_button_tournament') : t('register_button_tournament')}
                    </button>
                </div>
            `}).join('');

            document.querySelectorAll('.register-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const target = e.target as HTMLButtonElement;
                    const tournamentId = target.dataset.tournamentId;
                    if (!tournamentId || target.disabled) return;
                    try {
                        await registerForTournament(tournamentId);
                        await renderList();
                    } catch (error: any) {
                        alert(error.message);
                    }
                });
            });

        } catch (error) {
            listEl.innerHTML = `<p class="text-red-500">${t('tournaments_load_error')}</p>`;
        }
    };

    createBtn?.addEventListener('click', async () => {
        try {
            const newTournament = await createTournament();
            navigateTo(`/tournaments/${newTournament.id}`);
        } catch (error) {
            alert('Turnuva oluşturulamadı.');
        }
    });

    await renderList();
}