import { navigateTo } from "../router";
import { t } from '../i18n';
import { getMyActiveTournament } from "../api/tournaments";

export function render()
{
	return `
	<div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8">
	  <div class="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-xs sm:max-w-md text-center">
		<h2 class="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">${t('lobby_title')}</h2>
		
		<div id="lobby-buttons-container" class="flex flex-col space-y-3 sm:space-y-4">
			<a href="/tournaments" data-link class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 sm:py-4 px-4 rounded text-sm sm:text-base">
			${t('tournaments_button')}
			</a>
			<a href="/local-game" data-link class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 sm:py-4 px-4 rounded text-sm sm:text-base">
			${t('play_local_button')}
			</a>
			<a href="/online-lobby" data-link class="bg-green-500 hover:bg-green-700 text-white font-bold py-3 sm:py-4 px-4 rounded text-sm sm:text-base">
			${t('play_online_button')}
			</a>
		</div>

		<a href="/dashboard" data-link class="mt-6 sm:mt-8 inline-block font-bold text-sm text-blue-500 hover:text-blue-800">
			${t('return_to_chat')}
		</a>
		</div>
	</div>
	`;
}

let onlineButtonHandler: ((e: Event) => void) | null = null;

export async function afterRender()
{
	onlineButtonHandler = (e: Event) =>
	{
		e.preventDefault();
		navigateTo('/online-lobby');
	};
	document.querySelector('a[href="/online-lobby"]')?.addEventListener('click', onlineButtonHandler);

	const buttonsContainer = document.getElementById('lobby-buttons-container');
	if (!buttonsContainer)
		return;

	try
	{
		const activeTournament = await getMyActiveTournament();

		if (activeTournament && activeTournament.status === 'LOBBY')
		{
			const returnButton = document.createElement('a');
			returnButton.setAttribute('data-link', '');
			returnButton.href = `/tournaments/${activeTournament.id}`;
			returnButton.className = 'bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded';
			returnButton.textContent = t('return_to_tournament_lobby');
			buttonsContainer.prepend(returnButton);
		}
	}
	catch (error)
	{
		console.error("Failed to check for active tournament:", error);
	}
}

export function cleanup()
{
	if (onlineButtonHandler)
	{
		document.querySelector('a[href="/online-lobby"]')?.removeEventListener('click', onlineButtonHandler);
		onlineButtonHandler = null;
	}
}