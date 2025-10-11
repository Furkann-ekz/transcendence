import { registerUser } from '../api/auth';
import { navigateTo } from '../router';
import { t } from '../i18n';

let formSubmitHandler: ((e: SubmitEvent) => void) | null = null;

export function render()
{
	return `
		<div class="h-screen w-screen flex items-center justify-center bg-[#171A21] text-slate-100 p-4">
			<div class="bg-[#272A33] p-8 rounded-xl shadow-lg w-full max-w-md">
				<h2 class="text-2xl font-bold mb-6 text-center text-white">${t('register_title')}</h2>
				<form id="register-form" class="space-y-6">
					<div>
						<label for="name" class="block text-slate-300 text-sm font-bold mb-2">${t('name_label')}</label>
						<input type="text" id="name" name="name" class="border-transparent w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-[#171A21] text-white shadow-sm placeholder-slate-400">
					</div>
					<div>
						<label for="email" class="block text-slate-300 text-sm font-bold mb-2">${t('email_label')}</label>
						<input type="email" id="email" name="email" class="border-transparent w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-[#171A21] text-white shadow-sm placeholder-slate-400" required>
					</div>
					<div>
						<label for="password" class="block text-slate-300 text-sm font-bold mb-2">${t('password_label')}</label>
						<input type="password" id="password" name="password" class="border-transparent w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-[#171A21] text-white shadow-sm placeholder-slate-400" required>
					</div>
					<div class="flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-4">
						<button type="submit" class="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-6 transition">
							${t('register_button')}
						</button>
						<a href="/" class="text-center sm:text-left font-medium text-indigo-400 hover:text-indigo-300 transition" data-link>
							${t('login_link')}
						</a>
					</div>
				</form>
			</div>
		</div>
	`;
}

export function afterRender()
{
	const form = document.querySelector<HTMLFormElement>('#register-form');
	formSubmitHandler = async (e: SubmitEvent) =>
	{
		e.preventDefault();
		const name = (form!.querySelector('#name') as HTMLInputElement).value;
		const email = (form!.querySelector('#email') as HTMLInputElement).value;
		const password = (form!.querySelector('#password') as HTMLInputElement).value;
		try
		{
			await registerUser(email, password, name);
			alert(t('register_success_alert'));
			navigateTo('/');
		}
		catch (error: any)
		{
			alert(t(error.message));
		}
	};
	form?.addEventListener('submit', formSubmitHandler);
}

export function cleanup()
{
	if (formSubmitHandler)
	{
		document.querySelector<HTMLFormElement>('#register-form')?.removeEventListener('submit', formSubmitHandler);
		formSubmitHandler = null;
	}
}