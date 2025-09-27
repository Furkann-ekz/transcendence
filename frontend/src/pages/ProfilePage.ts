// frontend/src/pages/ProfilePage.ts
import { t } from '../i18n';
import { 
    getUserProfile, 
    getFriendshipStatus, 
    sendFriendRequest, 
    removeFriendship, 
    respondToFriendRequest,
    blockUser,
    unblockUser
} from '../api/users';
import { jwt_decode } from '../utils';
import { navigateTo } from '../router';

// Global değişkenler bu sayfa için
let profileId: number;
let myId: number | null;

// Butonları ve aksiyonları render eden ana fonksiyon
async function renderActionButtons() {
    const actionsContainer = document.getElementById('profile-actions-dynamic');
    if (!actionsContainer || !myId || profileId === myId) return;

    try {
        const status = await getFriendshipStatus(profileId);
        let buttonsHTML = '';

        if (status.friendshipStatus === 'blocked_by_them') {
            actionsContainer.innerHTML = `<p class="text-sm text-gray-500">Bu kullanıcıyla etkileşimde bulunamazsınız.</p>`;
            return;
        }

        switch (status.friendshipStatus) {
            case 'none':
                buttonsHTML += `<button id="add-friend-btn" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">Arkadaş Ekle</button>`;
                break;
            case 'pending_sent':
                buttonsHTML += `<button id="cancel-request-btn" data-friendship-id="${status.friendshipId}" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded w-full">İstek Gönderildi (İptal Et)</button>`;
                break;
            case 'pending_received':
                buttonsHTML += `
                    <p class="mb-2 text-sm">Size bir arkadaşlık isteği gönderdi.</p>
                    <div class="flex space-x-2">
                        <button id="accept-request-btn" data-friendship-id="${status.friendshipId}" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded w-full">Kabul Et</button>
                        <button id="reject-request-btn" data-friendship-id="${status.friendshipId}" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded w-full">Reddet</button>
                    </div>`;
                break;
            case 'friends':
                buttonsHTML += `<button id="remove-friend-btn" data-friendship-id="${status.friendshipId}" class="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded w-full">Arkadaşlıktan Çıkar</button>`;
                break;
        }

        if (status.isBlocked) {
            buttonsHTML += `<button id="unblock-user-btn" class="mt-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded w-full">Engeli Kaldır</button>`;
        } else {
            buttonsHTML += `<button id="block-user-btn" class="mt-2 bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded w-full">Engelle</button>`;
        }
        
        actionsContainer.innerHTML = buttonsHTML;
        attachButtonListeners();

    } catch (error) {
        console.error("Could not render action buttons:", error);
        actionsContainer.innerHTML = `<p class="text-red-500 text-sm">Aksiyonlar yüklenemedi.</p>`;
    }
}


// Olay dinleyicilerini butonlara atayan yardımcı fonksiyon
function attachButtonListeners() {
    document.getElementById('add-friend-btn')?.addEventListener('click', async () => { 
        await sendFriendRequest(profileId); 
        renderActionButtons();
    });
    document.getElementById('cancel-request-btn')?.addEventListener('click', async (e) => {
        const id = parseInt((e.target as HTMLElement).dataset.friendshipId!);
        await removeFriendship(id); 
        renderActionButtons();
    });
    document.getElementById('accept-request-btn')?.addEventListener('click', async (e) => {
        const id = parseInt((e.target as HTMLElement).dataset.friendshipId!);
        await respondToFriendRequest(id, true);
        renderActionButtons();
    });
    document.getElementById('reject-request-btn')?.addEventListener('click', async (e) => {
        const id = parseInt((e.target as HTMLElement).dataset.friendshipId!);
        await respondToFriendRequest(id, false);
        renderActionButtons();
    });
    document.getElementById('remove-friend-btn')?.addEventListener('click', async (e) => {
        const id = parseInt((e.target as HTMLElement).dataset.friendshipId!);
        await removeFriendship(id);
        renderActionButtons();
    });
    document.getElementById('block-user-btn')?.addEventListener('click', async () => {
        await blockUser(profileId);
        renderActionButtons();
    });
    document.getElementById('unblock-user-btn')?.addEventListener('click', async () => {
        await unblockUser(profileId);
        renderActionButtons();
    });
}

export function render(): string {
  return `
  <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div id="profile-card" class="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <img id="profile-avatar" src="/default-avatar.png" alt="Avatar" class="w-24 h-24 rounded-full object-cover border-2 border-gray-300 mb-4 mx-auto">
        <h2 id="profile-name" class="text-3xl font-bold mb-2">Yükleniyor...</h2>
        <p id="profile-created-at" class="text-gray-500 text-sm mb-6"></p>
        <div class="flex justify-center space-x-8 border-t border-b py-4">
          <div>
            <p class="text-2xl font-bold text-green-500" id="profile-wins">-</p>
            <p class="text-sm text-gray-600">${t('profile_wins')}</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-red-500" id="profile-losses">-</p>
            <p class="text-sm text-gray-600">${t('profile_losses')}</p>
          </div>
        </div>
        <div class="mt-6 space-y-2">
            <a id="match-history-link" href="#" data-link class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded block">
              ${t('view_match_history')}
            </a>
            <div id="profile-actions-dynamic" class="mt-2"></div>
        </div>
        <a href="/dashboard" data-link class="mt-4 inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
          ${t('return_to_chat')}
        </a>
      </div>
    </div>
  `;
}

export async function afterRender() {
    // EKSİK OLAN ELEMENT SEÇİMİ EKLENDİ
    const avatarElement = document.getElementById('profile-avatar') as HTMLImageElement;
    const nameElement = document.getElementById('profile-name');
    const createdAtElement = document.getElementById('profile-created-at');
    const winsElement = document.getElementById('profile-wins');
    const lossesElement = document.getElementById('profile-losses');
    const matchHistoryLink = document.getElementById('match-history-link');
    const actionsContainer = document.getElementById('profile-actions-dynamic');
    const pathParts = window.location.pathname.split('/');
    profileId = parseInt(pathParts[2], 10);
    const token = localStorage.getItem('token');
    myId = token ? jwt_decode(token).userId : null;

    if (isNaN(profileId) || !nameElement || !matchHistoryLink || !actionsContainer) {
        if (nameElement) nameElement.textContent = 'Geçersiz Profil';
        return;
    }
    
    matchHistoryLink.setAttribute('href', `/profile/${profileId}/history`);

    try {
        const userProfile = await getUserProfile(pathParts[2]);
        nameElement.textContent = userProfile.name || 'İsimsiz Kullanıcı';
        if (createdAtElement) createdAtElement.textContent = `${t('profile_joined_on')} ${new Date(userProfile.createdAt).toLocaleDateString()}`;
        if (winsElement) winsElement.textContent = userProfile.wins.toString();
        if (lossesElement) lossesElement.textContent = userProfile.losses.toString();
        if (userProfile.avatarUrl && avatarElement) {
            avatarElement.src = `${userProfile.avatarUrl}?t=${new Date().getTime()}`;
        }
        
        if (profileId === myId) {
            actionsContainer.innerHTML = `<a href="/profile/edit" data-link class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded block">${t('edit_profile_button')}</a>`;
        } else {
            await renderActionButtons();
        }
    } catch (error) {
        console.error("Profil verisi yüklenemedi:", error);
        nameElement.textContent = 'Profil Bulunamadı';
        navigateTo('/dashboard');
    }
}