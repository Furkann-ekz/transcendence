// frontend/src/pages/TournamentListPage.ts

import { navigateTo } from '../router';
import { t } from '../i18n';
import { jwt_decode } from '../utils';
import { getSocket } from '../socket';
import { getTournaments, joinTournament, createTournament } from '../api/tournaments'; 

interface TournamentSummary {
    id: string;
    name: string;
    host: { id: number; name: string; };
    _count: { players: number; };
    players: { userId: number }[]; 
}

// Olay dinleyicilerini dışarıda tanımlıyoruz
let createBtnHandler: (() => Promise<void>) | null = null;
let tournamentListClickHandler: ((e: Event) => void) | null = null;

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
        <h1 class="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">${t('tournaments_title')}</h1>
        <div class="max-w-xs sm:max-w-2xl md:max-w-4xl mx-auto">
            <div class="mb-4 text-center sm:text-right">
                <button id="create-tournament-btn" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded text-sm sm:text-base w-full sm:w-auto">
                    ${t('create_new_tournament')}
                </button>
            </div>
            <div id="tournament-list" class="space-y-3 sm:space-y-4">
                <p class="text-center">${t('loading_history')}...</p>
            </div>
             <a href="/lobby" data-link class="block text-center mt-4 sm:mt-6 text-blue-500 hover:text-blue-800 text-sm sm:text-base">${t('back_to_main_lobby')}</a>
        </div>
    </div>
  `;
}

export async function afterRender() {
    const listEl = document.getElementById('tournament-list');
    const token = localStorage.getItem('token');
    const myId = token ? jwt_decode(token).userId : null;
    const socket = getSocket();

    const renderList = async () => {
        if (!listEl) return;
        try {
            const tournaments: TournamentSummary[] = await getTournaments();
            if (tournaments.length === 0) {
                listEl.innerHTML = `<p class="text-center text-gray-500">${t('no_active_tournaments')}</p>`;
                return;
            }
            listEl.innerHTML = tournaments.map((tournament) => {
                const isPlayerJoined = tournament.players.some(p => p.userId === myId);
                return `
                <div class="bg-white p-3 sm:p-4 rounded-lg shadow-md flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                    <div class="flex-grow">
                        <a href="/tournaments/${tournament.id}" data-link class="text-lg sm:text-xl font-bold hover:text-blue-600 block">
                            ${tournament.name}
                        </a>
                        <p class="text-xs sm:text-sm text-gray-600 mt-1">${t('tournament_host')}: ${tournament.host.name}</p>
                        <p class="text-xs sm:text-sm text-gray-600">${t('players')}: ${tournament._count.players}/8</p>
                    </div>
                    <button 
                        data-tournament-id="${tournament.id}" 
                        class="register-btn ${isPlayerJoined ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-700'} text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded text-sm sm:text-base w-full sm:w-auto"
                        ${isPlayerJoined ? 'disabled' : ''}
                    >
                        ${isPlayerJoined ? t('registered_button_tournament') : t('register_button_tournament')}
                    </button>
                </div>
            `;
            }).join('');
            // --- DİKKAT: Buradaki querySelectorAll döngüsü kaldırıldı. ---
        } catch (error) {
            listEl.innerHTML = `<p class="text-red-500">${t('tournaments_load_error')}</p>`;
        }
    };

    // --- Olay Dinleyici Fonksiyonları ---
    createBtnHandler = async () => {
        try {
            const newTournament = await createTournament();
            navigateTo(`/tournaments/${newTournament.id}`);
        } catch (error: any) {
            // --- GÜNCELLEME BURADA ---
            // Gelen hata mesajını (artık bir anahtar) t() fonksiyonu ile çevirip gösteriyoruz.
            alert(t(error.message));
        }
    };

    // "Event Delegation" kullanarak 'register-btn' tıklamalarını yönet
    tournamentListClickHandler = async (e: Event) => {
        const target = e.target as HTMLElement;
        const registerButton = target.closest('.register-btn') as HTMLButtonElement;
        
        if (!registerButton) return; // Eğer tıklanan yer bir register butonu değilse, hiçbir şey yapma

        const tournamentId = registerButton.dataset.tournamentId;
        if (!tournamentId || registerButton.disabled) return;

        try {
            await joinTournament(tournamentId);
            // Başarılı katılım sonrası listeyi güncellemeye gerek yok,
            // çünkü backend'den gelen 'tournament_list_updated' olayı bunu zaten yapacak.
        } catch (error: any) {
            alert(t(error.message)); 
        }
    };
    
    // --- Dinleyicileri Ekleme ---
    document.getElementById('create-tournament-btn')?.addEventListener('click', createBtnHandler);
    listEl?.addEventListener('click', tournamentListClickHandler);

    await renderList();
    socket?.on('tournament_list_updated', renderList);
}

export function cleanup() {
    console.log("%c--- TournamentListPage CLEANUP ---", "color: purple; font-weight: bold;");
    const socket = getSocket();
    if (socket) {
        socket.off('tournament_list_updated');
    }
    if (createBtnHandler) {
        document.getElementById('create-tournament-btn')?.removeEventListener('click', createBtnHandler);
        createBtnHandler = null;
    }
    if (tournamentListClickHandler) {
        document.getElementById('tournament-list')?.removeEventListener('click', tournamentListClickHandler);
        tournamentListClickHandler = null;
    }
}