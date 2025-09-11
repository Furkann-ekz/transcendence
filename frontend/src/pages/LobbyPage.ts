import { navigateTo } from "../router";
import { t } from '../i18n';

export function render() {
  return `
    <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h2 class="text-2xl font-bold mb-6">${t('lobby_title')}</h2>
        <div class="flex flex-col space-y-4">
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

export function afterRender() {
    // DEĞİŞİKLİK: Artık butonu doğru href üzerinden arıyoruz.
    const onlineButton = document.querySelector('a[href="/online-lobby"]');
    
    onlineButton?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('/online-lobby');
    });
}