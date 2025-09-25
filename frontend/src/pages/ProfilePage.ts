import { t } from '../i18n';
import { getUserProfile, getFriendshipStatus, sendFriendRequest, removeFriendship, respondToFriendRequest } from '../api/users';
import { jwt_decode } from '../utils';

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div id="profile-card" class="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        
        <h2 id="profile-name" class="text-3xl font-bold mb-2">Loading...</h2>
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
        
        <div id="profile-actions" class="mt-6 space-y-2">
            </div>

        <a href="/dashboard" data-link class="mt-4 inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
          ${t('return_to_chat')}
        </a>
      </div>
    </div>
  `;
}

export async function afterRender() {
    const nameElement = document.getElementById('profile-name');
    const createdAtElement = document.getElementById('profile-created-at');
    const winsElement = document.getElementById('profile-wins');
    const lossesElement = document.getElementById('profile-losses');
    const profileActionsContainer = document.getElementById('profile-actions');

    const pathParts = window.location.pathname.split('/');
    const profileIdStr = pathParts[2];
    const profileId = parseInt(profileIdStr, 10);

    const token = localStorage.getItem('token');
    const myId = token ? jwt_decode(token).userId : null;

    if (isNaN(profileId) || !profileActionsContainer || !nameElement) {
        if (nameElement) nameElement.textContent = 'Invalid Profile';
        return;
    }

    async function renderFriendshipButton() {
        if (!profileActionsContainer || profileId === myId) return;

        try {
            const friendship = await getFriendshipStatus(profileId);
            let buttonHTML = '';
            
            if (friendship.status === 'none') {
                buttonHTML = `<button id="add-friend-btn" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">Arkadaş Ekle</button>`;
            } else if (friendship.status === 'PENDING') {
                if (friendship.isRequester) {
                    buttonHTML = `<button id="cancel-request-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded w-full">İstek Gönderildi (İptal Et)</button>`;
                } else {
                    buttonHTML = `
                        <p class="mb-2">Sana bir arkadaşlık isteği gönderdi.</p>
                        <div class="flex space-x-2">
                            <button id="accept-request-btn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded w-full">Kabul Et</button>
                            <button id="reject-request-btn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded w-full">Reddet</button>
                        </div>
                    `;
                }
            } else if (friendship.status === 'ACCEPTED') {
                buttonHTML = `<button id="remove-friend-btn" class="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded w-full">Arkadaşlıktan Çıkar</button>`;
            }

            // Önceki içeriği temizle ve yeni butonu ekle
            const friendButtonContainer = document.getElementById('friend-button-container');
            if(friendButtonContainer) friendButtonContainer.innerHTML = buttonHTML;

            // Event Listeners
            document.getElementById('add-friend-btn')?.addEventListener('click', async () => { await sendFriendRequest(profileId); renderFriendshipButton(); });
            document.getElementById('cancel-request-btn')?.addEventListener('click', async () => { await removeFriendship(friendship.id); renderFriendshipButton(); });
            document.getElementById('accept-request-btn')?.addEventListener('click', async () => { await respondToFriendRequest(friendship.id, true); renderFriendshipButton(); });
            document.getElementById('reject-request-btn')?.addEventListener('click', async () => { await respondToFriendRequest(friendship.id, false); renderFriendshipButton(); });
            document.getElementById('remove-friend-btn')?.addEventListener('click', async () => { await removeFriendship(friendship.id); renderFriendshipButton(); });

        } catch (error) {
            console.error("Could not load friendship status:", error);
        }
    }

    try {
        const userProfile = await getUserProfile(profileIdStr);
        nameElement.textContent = userProfile.name || 'Unnamed User';
        if (createdAtElement) createdAtElement.textContent = `${t('profile_joined_on')} ${new Date(userProfile.createdAt).toLocaleDateString()}`;
        if (winsElement) winsElement.textContent = userProfile.wins.toString();
        if (lossesElement) lossesElement.textContent = userProfile.losses.toString();

        profileActionsContainer.innerHTML = `<a id="match-history-link" href="/profile/${profileIdStr}/history" data-link class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded block">${t('view_match_history')}</a>`;
        
        if (profileId === myId) {
            profileActionsContainer.insertAdjacentHTML('beforeend', `<a href="/profile/edit" data-link class="mt-2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded block">${t('edit_profile_button')}</a>`);
        } else {
            const friendButtonDiv = document.createElement('div');
            friendButtonDiv.id = 'friend-button-container';
            friendButtonDiv.className = 'mt-2';
            profileActionsContainer.appendChild(friendButtonDiv);
            await renderFriendshipButton();
        }

    } catch (error) {
        console.error("Could not load profile data:", error);
        nameElement.textContent = 'Profile Not Found';
    }
}