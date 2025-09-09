// frontend/src/pages/RegisterPage.ts
import { registerUser } from '../api/auth';
import { navigateTo } from '../router';

export function render() {
  return `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 class="text-2xl font-bold mb-6 text-center">Kayıt Ol</h2>
        <form id="register-form">
          <div class="mb-4">
            <label for="name" class="block text-gray-700 text-sm font-bold mb-2">İsim (Opsiyonel)</label>
            <input type="text" id="name" name="name" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
          </div>
          <div class="mb-4">
            <label for="email" class="block text-gray-700 text-sm font-bold mb-2">E-posta</label>
            <input type="email" id="email" name="email" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
          </div>
          <div class="mb-6">
            <label for="password" class="block text-gray-700 text-sm font-bold mb-2">Şifre</label>
            <input type="password" id="password" name="password" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" required>
          </div>
          <div class="flex items-center justify-between">
            <button type="submit" class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              Kayıt Ol
            </button>
            <a href="/" class="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800" data-link>
              Zaten hesabın var mı? Giriş Yap
            </a>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function afterRender() {
  const form = document.querySelector<HTMLFormElement>('#register-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (form.querySelector('#name') as HTMLInputElement).value;
      const email = (form.querySelector('#email') as HTMLInputElement).value;
      const password = (form.querySelector('#password') as HTMLInputElement).value;

      try {
        await registerUser(email, password, name);
        alert('Kayıt başarılı! Lütfen giriş yapın.');
        navigateTo('/'); // Giriş sayfasına yönlendir
      } catch (error: any) {
        alert(error.message);
      }
    });
  }
}