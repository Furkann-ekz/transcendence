// frontend/src/pages/ProfilePage.ts
import { t } from '../i18n';
import { getUserProfile } from '../api/users';
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

        <a id="match-history-link" href="#" data-link class="mt-6 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded block">
          ${t('view_match_history')}
        </a>

        <a href="/dashboard" data-link class="mt-4 inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
          ${t('return_to_chat')}
        </a>
      </div>
    </div>
  `;
}

export async function afterRender() {
  const profileCard = document.getElementById('profile-card');
  const nameElement = document.getElementById('profile-name');
  const createdAtElement = document.getElementById('profile-created-at');
  const winsElement = document.getElementById('profile-wins');
  const lossesElement = document.getElementById('profile-losses');
  const matchHistoryLink = document.getElementById('match-history-link');

  const pathParts = window.location.pathname.split('/');
  const profileId = pathParts[2];

  const token = localStorage.getItem('token');
  const myId = token ? jwt_decode(token).userId : null;

  if (!profileId) {
    if (nameElement) nameElement.textContent = 'Invalid Profile';
    return;
  }
  
  // Maç geçmişi linkini, görüntülenen kullanıcının ID'sine göre dinamik olarak ayarla
  if (matchHistoryLink) {
    matchHistoryLink.setAttribute('href', `/profile/${profileId}/history`);
  }

  // Eğer kullanıcı kendi profiline bakıyorsa "Düzenle" butonunu ekle
  if (profileId == myId && profileCard) {
    const editButton = document.createElement('a');
    editButton.href = '/profile/edit';
    editButton.setAttribute('data-link', '');
    editButton.className = 'mt-2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded block';
    editButton.textContent = t('edit_profile_button');
    // "Profili Düzenle" butonunu, "Maç Geçmişi" butonunun hemen üstüne ekleyelim
    profileCard.insertBefore(editButton, matchHistoryLink);
  }

  try {
    const userProfile = await getUserProfile(profileId);
    
    if (nameElement) nameElement.textContent = userProfile.name || 'Unnamed User';
    if (createdAtElement) {
      const joinDate = new Date(userProfile.createdAt).toLocaleDateString();
      createdAtElement.textContent = `${t('profile_joined_on')} ${joinDate}`;
    }
    if (winsElement) winsElement.textContent = userProfile.wins.toString();
    if (lossesElement) lossesElement.textContent = userProfile.losses.toString();

  } catch (error) {
    if (nameElement) nameElement.textContent = 'Profile Not Found';
    console.error(error);
  }
}
