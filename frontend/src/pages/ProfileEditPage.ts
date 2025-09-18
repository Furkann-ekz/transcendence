import { t } from '../i18n';
import { changePassword, getCurrentUserProfile, updateUserProfile } from '../api/users';
import { navigateTo } from '../router';

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        
        <h2 class="text-2xl font-bold mb-6 text-center">${t('edit_profile_title')}</h2>
        <form id="edit-profile-form" class="mb-8">
          <div class="mb-4">
            <label for="name" class="block text-gray-700 text-sm font-bold mb-2">${t('name_label')}</label>
            <input type="text" id="name" name="name" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
          </div>
          <div class="flex items-center justify-between">
            <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              ${t('save_name_button')}
            </button>
            <a id="back-to-profile-link" href="#" class="inline-block align-baseline font-bold text-sm text-gray-500 hover:text-gray-800" data-link>
              ${t('back_button')}
            </a>
          </div>
        </form>

        <hr/>

        <h3 class="text-xl font-bold my-6 text-center">${t('change_password_title')}</h3>
        <form id="change-password-form">
            <div class="mb-4">
                <label for="current-password" class="block text-gray-700 text-sm font-bold mb-2">${t('current_password_label')}</label>
                <input type="password" id="current-password" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required>
            </div>
            <div class="mb-4">
                <label for="new-password" class="block text-gray-700 text-sm font-bold mb-2">${t('new_password_label')}</label>
                <input type="password" id="new-password" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required>
            </div>
            <div class="mb-6">
                <label for="confirm-password" class="block text-gray-700 text-sm font-bold mb-2">${t('confirm_password_label')}</label>
                <input type="password" id="confirm-password" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required>
            </div>
            <div class="flex items-center justify-start">
                <button type="submit" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                    ${t('change_password_button')}
                </button>
            </div>
        </form>
      </div>
    </div>
  `;
}

export async function afterRender() {
  const editProfileForm = document.getElementById('edit-profile-form') as HTMLFormElement;
  const nameInput = document.getElementById('name') as HTMLInputElement;
  const backLink = document.getElementById('back-to-profile-link');
  let userId: number | null = null;
  
  // Mevcut kullanıcı bilgilerini alıp formu doldur
  try {
    const profile = await getCurrentUserProfile();
    userId = profile.id;
    nameInput.value = profile.name || '';
    if(backLink) {
        backLink.setAttribute('href', `/profile/${userId}`);
    }
  } catch (error) {
    console.error(error);
    alert('Could not load user data.');
    navigateTo('/dashboard');
  }

  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = nameInput.value;

    try {
      await updateUserProfile({ name: newName });
      alert(t('profile_update_success'));
      if(userId) {
        navigateTo(`/profile/${userId}`);
      } else {
        navigateTo('/dashboard');
      }
    } catch (error: any) {
      alert(error.message);
    }
  });
  const changePasswordForm = document.getElementById('change-password-form') as HTMLFormElement;
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = (document.getElementById('current-password') as HTMLInputElement).value;
    const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
    const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement).value;

    if (newPassword !== confirmPassword) {
      alert(t('passwords_do_not_match'));
      return;
    }
    if (newPassword.length < 6) { // Örnek bir kural
        alert(t('password_too_short'));
        return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      alert(t('password_update_success'));
      changePasswordForm.reset(); // Formu temizle
    } catch (error: any) {
      alert(error.message);
    }
  });
}