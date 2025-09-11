// frontend/src/pages/LoginPage.ts
import { t } from '../i18n';
import { loginUser } from '../api/auth';
import { navigateTo } from '../router';
import { connectSocket } from '../socket'; // EKSİK IMPORT EKLENDİ


export function render() {
  return `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 class="text-2xl font-bold mb-6 text-center">${t('login_title')}</h2>
        <form id="login-form">
          <div class="mb-4">
            <label for="email" class="block text-gray-700 text-sm font-bold mb-2">${t('email_label')}</label>
            <input type="email" id="email" name="email" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
          </div>
          <div class="mb-6">
            <label for="password" class="block text-gray-700 text-sm font-bold mb-2">${t('password_label')}</label>
            <input type="password" id="password" name="password" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" required>
          </div>
          <div class="flex items-center justify-between">
            <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              ${t('login_button')}
            </button>
            <a href="/register" class="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800" data-link>
              ${t('register_link')}
            </a>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function afterRender() {
  const form = document.querySelector<HTMLFormElement>('#login-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (form.querySelector('#email') as HTMLInputElement).value;
      const password = (form.querySelector('#password') as HTMLInputElement).value;

      try {
        const data = await loginUser(email, password);
        localStorage.setItem('token', data.token);
        navigateTo('/dashboard');
      } catch (error: any) {
        alert(error.message);
      }
    });
  }
}