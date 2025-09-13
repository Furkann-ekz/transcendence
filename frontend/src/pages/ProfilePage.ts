import { t } from '../i18n';
import { getUserProfile } from '../api/users';

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div id="profile-card" class="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <!-- ... (mevcut profil kartı içeriği) ... -->
        
        <!-- YENİ BUTON -->
        <a id="match-history-link" href="#" data-link class="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          View Match History
        </a>

        <a href="/dashboard" data-link ...>${t('return_to_chat')}</a>
      </div>
    </div>
  `;
}

export async function afterRender() {
  const nameElement = document.getElementById('profile-name');
  const createdAtElement = document.getElementById('profile-created-at');
  const winsElement = document.getElementById('profile-wins');
  const lossesElement = document.getElementById('profile-losses');

  const matchHistoryLink = document.getElementById('match-history-link');
  const pathParts = window.location.pathname.split('/');
  const userId = pathParts[2];

  if (matchHistoryLink && userId) {
      matchHistoryLink.setAttribute('href', `/profile/${userId}/history`);
  }

  if (!userId) {
    if (nameElement) nameElement.textContent = 'Invalid Profile';
    return;
  }

  try {
    const userProfile = await getUserProfile(userId);
    
    // Gelen veriyle tüm HTML'i güncelle
    if (nameElement) nameElement.textContent = userProfile.name || 'Unnamed User';
    if (createdAtElement) {
      const joinDate = new Date(userProfile.createdAt).toLocaleDateString();
      createdAtElement.textContent = `${t('profile_joined_on')} ${joinDate}`;
    }
    // YENİ: İstatistikleri ekrana yazdır
    if (winsElement) winsElement.textContent = userProfile.wins.toString();
    if (lossesElement) lossesElement.textContent = userProfile.losses.toString();

  } catch (error) {
    if (nameElement) nameElement.textContent = 'Profile Not Found';
    console.error(error);
  }
}