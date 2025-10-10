// frontend/src/pages/RegisterPage.ts
import { registerUser } from '../api/auth';
import { navigateTo } from '../router';
import { t } from '../i18n';

let formSubmitHandler: ((e: SubmitEvent) => void) | null = null;

export function render() {
  return `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div class="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-xs sm:max-w-md">
        <h2 class="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">${t('register_title')}</h2>
        <form id="register-form">
          <div class="mb-4">
            <label for="name" class="block text-gray-700 text-sm font-bold mb-2">${t('name_label')}</label>
            <input type="text" id="name" name="name" class="shadow appearance-none border rounded w-full py-2 sm:py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm sm:text-base">
          </div>
          <div class="mb-4">
            <label for="email" class="block text-gray-700 text-sm font-bold mb-2">${t('email_label')}</label>
            <input type="email" id="email" name="email" class="shadow appearance-none border rounded w-full py-2 sm:py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm sm:text-base" required>
          </div>
          <div class="mb-6">
            <label for="password" class="block text-gray-700 text-sm font-bold mb-2">${t('password_label')}</label>
            <input type="password" id="password" name="password" class="shadow appearance-none border rounded w-full py-2 sm:py-3 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline text-sm sm:text-base" required>
          </div>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <button type="submit" class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded focus:outline-none focus:shadow-outline w-full sm:w-auto text-sm sm:text-base">
              ${t('register_button')}
            </button>
            <a href="/" class="inline-block text-center sm:text-left font-bold text-sm text-blue-500 hover:text-blue-800" data-link>
              ${t('login_link')}
            </a>
          </div>
        </form>
      </div>
    </div>
  `;
}

// afterRender fonksiyonu aynı kalıyor
export function afterRender() {
  const form = document.querySelector<HTMLFormElement>('#register-form');
  formSubmitHandler = async (e: SubmitEvent) => {
    e.preventDefault();
    const name = (form!.querySelector('#name') as HTMLInputElement).value;
    const email = (form!.querySelector('#email') as HTMLInputElement).value;
    const password = (form!.querySelector('#password') as HTMLInputElement).value;
    try {
      await registerUser(email, password, name);
      alert(t('register_success_alert'));
      navigateTo('/');
    } catch (error: any) {
      // --- DEĞİŞİKLİK BURADA ---
      // Artık backend'den gelen hata anahtarını doğrudan t() fonksiyonuna veriyoruz.
      // Bu sayede hem e-posta hem de kullanıcı adı hatasını gösterebiliriz.
      alert(t(error.message));
    }
  };
  form?.addEventListener('submit', formSubmitHandler);
}

export function cleanup() {
    if (formSubmitHandler) {
        document.querySelector<HTMLFormElement>('#register-form')?.removeEventListener('submit', formSubmitHandler);
        formSubmitHandler = null;
    }
}