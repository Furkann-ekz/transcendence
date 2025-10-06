import { t } from '../i18n';
import { changePassword, getCurrentUserProfile, updateUserProfile } from '../api/users';
import { navigateTo } from '../router';

// Tip tanımını dışarıda yapmak daha temiz bir yöntemdir.
interface UserProfile {
    id: number;
    name: string | null;
    avatarUrl: string | null;
}

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 class="text-2xl font-bold mb-6 text-center">${t('edit_profile_title')}</h2>
        <form id="edit-profile-form" class="mb-8">
            <div class="flex flex-col items-center mb-6">
                <div id="avatar-preview" class="w-24 h-24 rounded-full border-2 border-gray-300 mb-4 bg-cover bg-center bg-gray-200"></div>
                <input type="file" id="avatar-upload" class="hidden" accept="image/png, image/jpeg">
                <button type="button" id="avatar-upload-btn" class="bg-gray-200 text-sm text-gray-700 font-bold py-2 px-4 rounded">${t('change_avatar_button')}</button>
            </div>
            <div class="mb-4">
                <label for="name" class="block text-gray-700 text-sm font-bold mb-2">${t('name_label')}</label>
                <input type="text" id="name" name="name" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
            </div>
            <div class="flex items-center justify-between">
                <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                ${t('save_button')}
                </button>
                <a id="back-to-profile-link" href="#" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded" data-link>
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
  const avatarPreview = document.getElementById('avatar-preview') as HTMLDivElement;
  const avatarUploadInput = document.getElementById('avatar-upload') as HTMLInputElement;
  const avatarUploadBtn = document.getElementById('avatar-upload-btn');
  
  let userId: number | null = null;
  let newAvatarFile: File | null = null;
  let profile: UserProfile | null = null;
  
  try {
    profile = await getCurrentUserProfile(); 
    userId = profile!.id;
    nameInput.value = profile!.name || '';
    if (profile!.avatarUrl) {
        avatarPreview.style.backgroundImage = `url(${profile!.avatarUrl}?t=${new Date().getTime()})`;
    } else {
        avatarPreview.style.backgroundImage = `url(/default-avatar.png)`;
    }
    if(backLink) {
        backLink.setAttribute('href', `/profile/${userId}`);
    }
  } catch (error) {
    console.error(error);
    alert('Kullanıcı verisi yüklenemedi.');
    navigateTo('/dashboard');
  }
  
  avatarUploadBtn?.addEventListener('click', () => avatarUploadInput.click());

  avatarUploadInput.addEventListener('change', () => {
    if (avatarUploadInput.files && avatarUploadInput.files[0]) {
        const file = avatarUploadInput.files[0];
        newAvatarFile = file;
        avatarPreview.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
    }
  });

  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!profile) {
        alert('Profil bilgileri yüklenemediği için kayıt yapılamıyor.');
        return;
    }
      
    const newName = nameInput.value;
    let avatarUpdated = false;

    if (newAvatarFile) {
        const formData = new FormData();
        formData.append('file', newAvatarFile);
        
        try {
          const response = await fetch('/api/profile/avatar', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Avatar yüklenemedi.');
            }
            newAvatarFile = null; 
            avatarUpdated = true;
        } catch (error: any) {
            alert('Avatar yüklenemedi: ' + error.message);
            return; 
        }
    }

    try {
      const nameChanged = profile.name !== newName;
      if (nameChanged) {
        await updateUserProfile({ name: newName });
      }
      
      if (nameChanged || avatarUpdated) {
        alert(t('profile_update_success'));
      }
      
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
    if (newPassword.length < 6) {
        alert(t('password_too_short'));
        return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      alert(t('password_update_success'));
      changePasswordForm.reset();
    } catch (error: any) {
      alert(error.message);
    }
  });
}