import { t } from '../i18n';
import { changePassword, getCurrentUserProfile, updateUserAvatar, updateUserProfile } from '../api/users';
import { navigateTo } from '../router';
import { jwt_decode } from '../utils';

interface UserProfile { id: number; name: string | null; avatarUrl: string | null; }

let avatarUploadBtnHandler: (() => void) | null = null;
let avatarUploadInputHandler: (() => void) | null = null;
let editProfileFormHandler: ((e: SubmitEvent) => Promise<void>) | null = null;
let changePasswordFormHandler: ((e: SubmitEvent) => Promise<void>) | null = null;

export function render(): string
{
	const token = localStorage.getItem('token');
	const myUserId = token ? jwt_decode(token).userId : '/';
	return `
	<div class="h-screen w-screen flex flex-col bg-[#171A21] text-slate-100">
		<nav class="sticky top-0 z-10 bg-[#171A21] border-b border-slate-700/50 flex-shrink-0">
			<div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap md:flex-nowrap items-center justify-center md:justify-between gap-4">
				<div class="w-full md:w-auto text-center md:text-left">
					<h1 class="text-2xl font-bold tracking-tight text-white">Transcendence</h1>
				</div>
				<div class="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
					<a href="/profile/${myUserId}" data-link class="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-5 transition">${t('my_profile_button')}</a>
					<a href="/lobby" data-link class="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-5 transition">${t('go_to_game')}</a>
					<button id="logout-button" class="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-5 transition">${t('logout')}</button>
				</div>
			</div>
		</nav>
		<main class="flex-grow flex items-center justify-center p-4">
			<div class="bg-[#272A33] p-8 rounded-xl shadow-lg w-full max-w-md">
				<h2 class="text-2xl font-bold mb-6 text-center text-white">${t('edit_profile_title')}</h2>
				<form id="edit-profile-form" class="mb-8">
					<div class="flex flex-col items-center mb-6">
						<div id="avatar-preview" class="w-24 h-24 rounded-full border-4 border-slate-600 mb-4 bg-cover bg-center bg-slate-700"></div>
						<input type="file" id="avatar-upload" class="hidden" accept="image/png, image/jpeg">
						<button type="button" id="avatar-upload-btn" class="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-5 transition">${t('change_avatar_button')}</button>
					</div>
					<div class="mb-4">
						<label for="name" class="block text-slate-300 text-sm font-bold mb-2">${t('name_label')}</label>
						<input type="text" id="name" name="name" class="border-transparent w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-[#171A21] text-white shadow-sm placeholder-slate-400" required>
					</div>
					<div class="flex items-center justify-between gap-4">
						<button type="submit" class="w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-5 transition">
						${t('save_button')}
						</button>
						<a id="back-to-profile-link" href="#" class="w-full inline-flex items-center justify-center rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-5 transition" data-link>
						${t('back_to_profile_button')}
						</a>
					</div>
				</form>
				<hr class="border-slate-700/50"/>
				<h3 class="text-xl font-bold my-6 text-center text-white">${t('change_password_title')}</h3>
				<form id="change-password-form">
					<div class="mb-4">
						<label for="current-password" class="block text-slate-300 text-sm font-bold mb-2">${t('current_password_label')}</label>
						<input type="password" id="current-password" class="border-transparent w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-[#171A21] text-white shadow-sm" required>
					</div>
					<div class="mb-4">
						<label for="new-password" class="block text-slate-300 text-sm font-bold mb-2">${t('new_password_label')}</label>
						<input type="password" id="new-password" class="border-transparent w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-[#171A21] text-white shadow-sm" required>
					</div>
					<div class="mb-6">
						<label for="confirm-password" class="block text-slate-300 text-sm font-bold mb-2">${t('confirm_password_label')}</label>
						<input type="password" id="confirm-password" class="border-transparent w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-[#171A21] text-white shadow-sm" required>
					</div>
					<div class="flex items-center justify-start">
						<button type="submit" class="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-5 transition">
							${t('change_password_button')}
						</button>
					</div>
				</form>
			</div>
		</main>
	</div>
	`;
}

export async function afterRender()
{
	const editProfileForm = document.getElementById('edit-profile-form') as HTMLFormElement;
	const nameInput = document.getElementById('name') as HTMLInputElement;
	const backLink = document.getElementById('back-to-profile-link');
	const avatarPreview = document.getElementById('avatar-preview') as HTMLDivElement;
	const avatarUploadInput = document.getElementById('avatar-upload') as HTMLInputElement;
	const avatarUploadBtn = document.getElementById('avatar-upload-btn');
	const changePasswordForm = document.getElementById('change-password-form') as HTMLFormElement;
	
	let userId: number | null = null;
	let newAvatarFile: File | null = null;
	let profile: UserProfile | null = null;
	
	try
	{
		profile = await getCurrentUserProfile(); 
		userId = profile!.id;
		nameInput.value = profile!.name || '';
		if (profile!.avatarUrl)
			avatarPreview.style.backgroundImage = `url(${profile!.avatarUrl}?t=${new Date().getTime()})`;
		else
			avatarPreview.style.backgroundImage = `url(/default-avatar.png)`;
		if(backLink)
			backLink.setAttribute('href', `/profile/${userId}`);
	}
	catch (error)
	{
		console.error(error);
		alert('Kullanıcı verisi yüklenemedi.');
		navigateTo('/dashboard');
		return ;
	}
	
	const logoutButton = document.getElementById('logout-button');
	const logoutHandler = () => {
		localStorage.removeItem('token');
		navigateTo('/');
	};
	logoutButton?.addEventListener('click', logoutHandler);
	
	avatarUploadBtnHandler = () => avatarUploadInput.click();
	
	avatarUploadInputHandler = () =>
	{
		if (avatarUploadInput.files && avatarUploadInput.files[0])
		{
			const file = avatarUploadInput.files[0];
			newAvatarFile = file;
			avatarPreview.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
		}
	};

	editProfileFormHandler = async (e) =>
	{
		e.preventDefault();
		if (!profile)
		{
			alert('Profil bilgileri yüklenemediği için kayıt yapılamıyor.');
			return ;
		}
		const newName = nameInput.value;
		let avatarUpdated = false;
		if (newAvatarFile)
		{
			const formData = new FormData();
			formData.append('file', newAvatarFile);
			try
			{
					await updateUserAvatar(formData);
					newAvatarFile = null; 
					avatarUpdated = true;
			}
			catch (error: any)
			{
					alert('Avatar yüklenemedi: ' + error.message);
					return ; 
			}
		}
		try
		{
			const nameChanged = profile.name !== newName;
			if (nameChanged)
				await updateUserProfile({ name: newName });
			if (nameChanged || avatarUpdated)
				alert(t('profile_update_success'));
			if (userId)
				navigateTo(`/profile/${userId}`);
			else
				navigateTo('/dashboard');
		}
		catch (error: any)
		{
			alert(t(error.message));
		}
	};
	
	changePasswordFormHandler = async (e) =>
	{
		e.preventDefault();
		const currentPassword = (document.getElementById('current-password') as HTMLInputElement).value;
		const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
		const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement).value;

		if (newPassword !== confirmPassword)
		{
			alert(t('passwords_do_not_match'));
			return;
		}
		if (newPassword.length < 6)
		{
			alert(t('password_too_short'));
			return ;
		}
		try
		{
			await changePassword({ currentPassword, newPassword });
			alert(t('password_update_success'));
			changePasswordForm.reset();
		}
		catch (error: any)
		{
			alert(error.message);
		}
	};

	avatarUploadBtn?.addEventListener('click', avatarUploadBtnHandler);
	avatarUploadInput.addEventListener('change', avatarUploadInputHandler);
	editProfileForm.addEventListener('submit', editProfileFormHandler);
	changePasswordForm.addEventListener('submit', changePasswordFormHandler);
}

export function cleanup()
{
	console.log("%c--- ProfileEditPage CLEANUP ---", "color: orange; font-weight: bold;");

	const avatarUploadBtn = document.getElementById('avatar-upload-btn');
	const avatarUploadInput = document.getElementById('avatar-upload');
	const editProfileForm = document.getElementById('edit-profile-form');
	const changePasswordForm = document.getElementById('change-password-form');

	if (avatarUploadBtnHandler)
		avatarUploadBtn?.removeEventListener('click', avatarUploadBtnHandler);
	if (avatarUploadInputHandler)
		avatarUploadInput?.removeEventListener('change', avatarUploadInputHandler);
	if (editProfileFormHandler)
		editProfileForm?.removeEventListener('submit', editProfileFormHandler);
	if (changePasswordFormHandler)
		changePasswordForm?.removeEventListener('submit', changePasswordFormHandler);

	const logoutButton = document.getElementById('logout-button');
	if (logoutButton)
	{
		// This is a bit of a hack, but we need to remove the listener.
		// A better approach would be to manage this listener in a more structured way.
		const newLogoutButton = logoutButton.cloneNode(true);
		logoutButton.parentNode?.replaceChild(newLogoutButton, logoutButton);
	}

	avatarUploadBtnHandler = null;
	avatarUploadInputHandler = null;
	editProfileFormHandler = null;
	changePasswordFormHandler = null;
}