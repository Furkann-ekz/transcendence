import { t } from '../i18n';
import { loginUser } from '../api/auth';
import { navigateTo } from '../router';

let formSubmitHandler: ((e: SubmitEvent) => void) | null = null;

export function render()
{
	return `
		<div class="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
			<div class="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-xs sm:max-w-md">
				<h2 class="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">${t('login_title')}</h2>
				<form id="login-form">
					<div class="mb-4">
						<label for="email" class="block text-gray-700 text-sm font-bold mb-2">${t('email_label')}</label>
						<input type="email" id="email" name="email" class="shadow appearance-none border rounded w-full py-2 sm:py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm sm:text-base" required>
					</div>
					<div class="mb-6">
						<label for="password" class="block text-gray-700 text-sm font-bold mb-2">${t('password_label')}</label>
						<input type="password" id="password" name="password" class="shadow appearance-none border rounded w-full py-2 sm:py-3 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline text-sm sm:text-base" required>
					</div>
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
						<button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded focus:outline-none focus:shadow-outline w-full sm:w-auto text-sm sm:text-base">
							${t('login_button')}
						</button>
						<a href="/register" class="inline-block text-center sm:text-left font-bold text-sm text-blue-500 hover:text-blue-800" data-link>
							${t('register_link')}
						</a>
					</div>
				</form>
			</div>
		</div>
	`;
}

export function afterRender()
{
	const form = document.querySelector<HTMLFormElement>('#login-form');
	formSubmitHandler = async (e: SubmitEvent) =>
	{
		e.preventDefault();
		const email = (form!.querySelector('#email') as HTMLInputElement).value;
		const password = (form!.querySelector('#password') as HTMLInputElement).value;
		try
		{
			const data = await loginUser(email, password);
			localStorage.setItem('token', data.token);
			navigateTo('/dashboard');
		}
		catch (error: any)
		{
			alert(t('error_invalid_credentials'));
		}
	};
	form?.addEventListener('submit', formSubmitHandler);
}

export function cleanup()
{
		if (formSubmitHandler)
		{
			document.querySelector<HTMLFormElement>('#login-form')?.removeEventListener('submit', formSubmitHandler);
			formSubmitHandler = null;
		}
}