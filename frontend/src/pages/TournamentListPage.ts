// frontend/src/pages/TournamentListPage.ts

import { navigateTo } from '../router';
import { t } from '../i18n';
import { jwt_decode } from '../utils';
import { getSocket } from '../socket';
// DEĞİŞİKLİK: API fonksiyonlarını merkezi dosyadan import ediyoruz.
import { getTournaments, joinTournament, createTournament } from '../api/tournaments'; 

// Tip Tanımlamaları
interface TournamentSummary {
    id: string;
    name: string;
    host: { id: number; name: string; };
    _count: { players: number; };
    players: { userId: number }[]; 
}

// DEĞİŞİKLİK: Bu sayfadaki yerel 'fetchTournaments', 'registerForTournament' ve 
// 'createTournament' fonksiyonları kaldırıldı çünkü artık merkezi API dosyasını kullanıyoruz.

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

export async function afterRender() {
    const listEl = document.getElementById('tournament-list');
    const createBtn = document.getElementById('create-tournament-btn');
    const token = localStorage.getItem('token');
    const myId = token ? jwt_decode(token).userId : null;
    const socket = getSocket();

    const renderList = async () => {
        if (!listEl) return;
        try {
            // Artık import ettiğimiz merkezi 'getTournaments' fonksiyonunu kullanıyoruz.
            const tournaments: TournamentSummary[] = await getTournaments();
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
            `;
            }).join('');

            document.querySelectorAll('.register-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const target = e.target as HTMLButtonElement;
                    const tournamentId = target.dataset.tournamentId;
                    if (!tournamentId || target.disabled) return;
                    try {
                        await joinTournament(tournamentId);
                        await renderList();
                    } catch (error: any) {
                        // Gelen hata mesajını (artık bir anahtar) t() fonksiyonu ile çeviriyoruz.
                        alert(t(error.message)); 
                    }
                });
            });

        } catch (error) {
            listEl.innerHTML = `<p class="text-red-500">${t('tournaments_load_error')}</p>`;
        }
    };

    createBtn?.addEventListener('click', async () => {
        try {
            // Artık import ettiğimiz merkezi 'createTournament' fonksiyonunu kullanıyoruz.
            const newTournament = await createTournament();
            navigateTo(`/tournaments/${newTournament.id}`);
        } catch (error: any) {
            alert(error.message || 'Turnuva oluşturulamadı.');
        }
    });

    await renderList();
    if (socket) {
        socket.on('tournament_list_updated', () => {
            console.log('Tournament listesi güncellendi, yeniden çiziliyor...');
            renderList();
        });
    }
}

export function cleanup() {
    const socket = getSocket();
    if (socket) {
        socket.off('tournament_list_updated');
    }
}