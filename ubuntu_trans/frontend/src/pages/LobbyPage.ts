// frontend/src/pages/LobbyPage.ts

import { navigateTo } from "../router";
import { getSocket } from "../socket";

export function render() {
  return `
    <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h2 class="text-2xl font-bold mb-6">Oyun Modunu Seç</h2>
        <div class="flex flex-col space-y-4">
          <a href="/local-game" data-link class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded">
            Yerel Oyna (Aynı Bilgisayarda)
          </a>
          <a href="/online-game" data-link class="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded">
            Online Oyna (Rakip Bul)
          </a>
        </div>
        <a href="/dashboard" data-link class="mt-8 inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
          Sohbete Geri Dön
        </a>
      </div>
    </div>
  `;
}

export function afterRender() {
    const onlineButton = document.querySelector('a[href="/online-game"]');
    
    onlineButton?.addEventListener('click', (e) => {
        e.preventDefault();
        const socket = getSocket();
        if (socket) {
            // YENİ: Sunucuya "eşleştirme havuzuna katıl" mesajı gönder
            socket.emit('joinMatchmaking');
        }
        navigateTo('/online-game');
    });
}
