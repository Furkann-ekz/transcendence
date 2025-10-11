import { navigateTo } from '../router';
import { getSocket } from '../socket';
import { t } from '../i18n';

export function render(): string
{
	return `
		<div class="h-screen w-screen flex items-center justify-center bg-[#171A21] text-slate-100 p-4">
			<div class="bg-[#272A33] p-8 rounded-xl shadow-lg w-full max-w-md text-center">
				<h2 class="text-2xl font-bold mb-6 text-white">${t('online_lobby_title')}</h2>
				<div class="flex flex-col space-y-4">
					<button id="1v1-button" class="w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-5 transition">
						${t('play_1v1_button')}
					</button>
					<button id="2v2-button" class="w-full inline-flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-5 transition">
						${t('play_2v2_button')}
					</button>
				</div>
				<a href="/lobby" data-link class="mt-8 inline-block font-medium text-indigo-400 hover:text-indigo-300 transition">
					${t('back_button')}
				</a>
			</div>
		</div>
	`;
}

let button1v1Handler: (() => void) | null = null;
let button2v2Handler: (() => void) | null = null;

export function afterRender()
{
	const socket = getSocket();

	button1v1Handler = () =>
	{
		if (socket)
			socket.emit('joinMatchmaking', { mode: '1v1' });
		navigateTo('/online-game');
	};
	button2v2Handler = () =>
	{
		if (socket)
			socket.emit('joinMatchmaking', { mode: '2v2' });
		navigateTo('/online-game');
	};

	document.getElementById('1v1-button')?.addEventListener('click', button1v1Handler);
	document.getElementById('2v2-button')?.addEventListener('click', button2v2Handler);
}

export function cleanup()
{
	if (button1v1Handler)
	{
			document.getElementById('1v1-button')?.removeEventListener('click', button1v1Handler);
			button1v1Handler = null;
	}
	if (button2v2Handler)
	{
			document.getElementById('2v2-button')?.removeEventListener('click', button2v2Handler);
			button2v2Handler = null;
	}
}