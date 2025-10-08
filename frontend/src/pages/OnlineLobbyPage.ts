// frontend/src/pages/OnlineLobbyPage.ts
import { navigateTo } from '../router';
import { getSocket } from '../socket';
import { t } from '../i18n';

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h2 class="text-2xl font-bold mb-6">${t('online_lobby_title')}</h2>
        <div class="flex flex-col space-y-4">
          <button id="1v1-button" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded">
            ${t('play_1v1_button')}
          </button>
          <button id="2v2-button" class="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded">
            ${t('play_2v2_button')}
          </button>
        </div>
        <a href="/lobby" data-link class="mt-8 inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
          ${t('back_button')}
        </a>
      </div>
    </div>
  `;
}

// afterRender fonksiyonu aynı kalıyor
let button1v1Handler: (() => void) | null = null;
let button2v2Handler: (() => void) | null = null;

export function afterRender() {
    const socket = getSocket();

    button1v1Handler = () => {
        if (socket) socket.emit('joinMatchmaking', { mode: '1v1' });
        navigateTo('/online-game');
    };
    button2v2Handler = () => {
        if (socket) socket.emit('joinMatchmaking', { mode: '2v2' });
        navigateTo('/online-game');
    };

    document.getElementById('1v1-button')?.addEventListener('click', button1v1Handler);
    document.getElementById('2v2-button')?.addEventListener('click', button2v2Handler);
}

export function cleanup() {
    if (button1v1Handler) {
        document.getElementById('1v1-button')?.removeEventListener('click', button1v1Handler);
        button1v1Handler = null;
    }
    if (button2v2Handler) {
        document.getElementById('2v2-button')?.removeEventListener('click', button2v2Handler);
        button2v2Handler = null;
    }
}