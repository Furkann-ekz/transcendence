// frontend/src/pages/LobbyPage.ts
import { navigateTo } from "../router";
import { t } from '../i18n';
import { getMyActiveTournament } from "../api/tournaments"; // Yeni import

export function render() {
  return `
    <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h2 class="text-2xl font-bold mb-6">${t('lobby_title')}</h2>
        
        <div id="lobby-buttons-container" class="flex flex-col space-y-4">
          <a href="/tournaments" data-link class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded">
            ${t('tournaments_button')}
          </a>
          <a href="/local-game" data-link class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded">
            ${t('play_local_button')}
          </a>
          <a href="/online-lobby" data-link class="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded">
            ${t('play_online_button')}
          </a>
        </div>

        <a href="/dashboard" data-link class="mt-8 inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
          ${t('return_to_chat')}
        </a>
      </div>
    </div>
  `;
}

export async function afterRender() {
    // Önceki afterRender içeriği burada kalabilir, altına ekleme yapıyoruz.
    const onlineButton = document.querySelector('a[href="/online-lobby"]');
    onlineButton?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('/online-lobby');
    });

    // --- YENİ EKLENEN BÖLÜM ---
    const buttonsContainer = document.getElementById('lobby-buttons-container');
    if (!buttonsContainer) return;

    try {
        const activeTournament = await getMyActiveTournament();
        if (activeTournament && activeTournament.id) {
            const returnButton = document.createElement('a');
            returnButton.href = `/tournament/${activeTournament.id}/play`;
            returnButton.setAttribute('data-link', '');
            returnButton.className = 'bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded';
            returnButton.textContent = t('return_to_active_tournament'); // <-- Metni t() fonksiyonu ile çeviriyoruz

            buttonsContainer.prepend(returnButton);
        }
    } catch (error) {
        console.error("Failed to check for active tournament:", error);
    }
}