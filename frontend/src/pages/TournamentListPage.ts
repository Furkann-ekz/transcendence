// frontend/src/pages/TournamentListPage.ts

import { navigateTo } from '../router';

async function fetchTournaments() {
    const response = await fetch('/api/tournaments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Failed to fetch tournaments.');
    return response.json();
}

async function createTournament() {
    const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Failed to create tournament.');
    return response.json();
}

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 p-8">
        <h1 class="text-3xl font-bold mb-6 text-center">Turnuvalar</h1>
        <div class="max-w-4xl mx-auto">
            <div class="mb-4 text-right">
                <button id="create-tournament-btn" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Yeni Turnuva Oluştur
                </button>
            </div>
            <div id="tournament-list" class="space-y-4">
                <p>Turnuvalar yükleniyor...</p>
            </div>
        </div>
    </div>
  `;
}

export async function afterRender() {
    const listEl = document.getElementById('tournament-list');
    const createBtn = document.getElementById('create-tournament-btn');

    async function renderList() {
        if (!listEl) return;
        try {
            const tournaments = await fetchTournaments();
            if (tournaments.length === 0) {
                listEl.innerHTML = '<p>Aktif turnuva bulunmuyor.</p>';
                return;
            }
            listEl.innerHTML = tournaments.map((t: any) => `
                <div class="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
                    <div>
                        <h2 class="text-xl font-bold">Turnuva #${t.id.substring(0, 8)}</h2>
                        <p class="text-sm text-gray-600">Kurucu: ${t.host.name} | Oyuncular: ${t._count.players}/8</p>
                    </div>
                    <a href="/tournaments/${t.id}" data-link class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Katıl</a>
                </div>
            `).join('');
        } catch (error) {
            listEl.innerHTML = '<p class="text-red-500">Turnuvalar yüklenemedi.</p>';
        }
    }

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