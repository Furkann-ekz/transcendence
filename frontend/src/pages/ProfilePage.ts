import { t } from '../i18n';
import { getUserProfile } from '../api/users';

export function render(): string {
  // Başlangıçta boş bir iskelet render ediyoruz.
  // Gerçek veri, afterRender'da API'den gelince doldurulacak.
  return `
    <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div id="profile-card" class="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h2 id="profile-name" class="text-3xl font-bold mb-4">Loading...</h2>
        <p id="profile-created-at" class="text-gray-600"></p>
        <a href="/dashboard" data-link class="mt-8 inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
          ${t('return_to_chat')}
        </a>
      </div>
    </div>
  `;
}

export async function afterRender() {
  const nameElement = document.getElementById('profile-name');
  const createdAtElement = document.getElementById('profile-created-at');

  // URL'den kullanıcı ID'sini alıyoruz (örn: /profile/1 -> 1)
  const pathParts = window.location.pathname.split('/');
  const userId = pathParts[2];

  if (!userId) {
    if (nameElement) nameElement.textContent = 'Invalid Profile';
    return;
  }

  try {
    const userProfile = await getUserProfile(userId);
    
    // Gelen veriyle HTML'i güncelle
    if (nameElement) nameElement.textContent = userProfile.name || 'Unnamed User';
    if (createdAtElement) {
      const joinDate = new Date(userProfile.createdAt).toLocaleDateString();
      createdAtElement.textContent = `Joined on ${joinDate}`; // Bunu da çevirebiliriz
    }

  } catch (error) {
    if (nameElement) nameElement.textContent = 'Profile Not Found';
    console.error(error);
  }
}