import { t } from '../i18n';
import { getMatchHistory } from '../api/users';
import { getUserProfile } from '../api/users';
import { jwt_decode } from '../utils';
import { navigateTo } from '../router';

function formatDuration(seconds: number): string
{
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return (`${minutes}:${remainingSeconds.toString().padStart(2, '0')}`);
}

let logoutClickListener: (() => void) | null = null;

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
		<main class="flex-grow flex flex-col items-center p-4 overflow-auto">
			<div class="w-full max-w-4xl">
				<h1 id="history-title" class="text-3xl font-bold mb-6 text-center text-white">${t('match_history_title')}</h1>
				
				<div id="stats-dashboard" class="bg-[#272A33] p-5 rounded-xl shadow-lg mb-6">
					<p class="text-center text-slate-400">${t('loading_history')}...</p>
				</div>

				<div id="match-history-list" class="space-y-4 max-h-[60vh] overflow-y-auto p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
					{/* Match items will be rendered here */}
				</div>
				<div class="text-center mt-8">
					<a id="back-to-profile-link" href="#" data-link class="font-medium text-indigo-400 hover:text-indigo-300 transition">${t('back_button')}</a>
				</div>
			</div>
		</main>
	</div>
  `;
}

export async function afterRender()
{
	const listContainer = document.getElementById('match-history-list');
	const statsDashboard = document.getElementById('stats-dashboard');
	const titleElement = document.getElementById('history-title');
	const backLink = document.getElementById('back-to-profile-link');

	const pathParts = window.location.pathname.split('/');
	const userId = pathParts[2];

	if (!listContainer || !userId || !titleElement || !backLink || !statsDashboard)
		return ;
	
	backLink.setAttribute('href', `/profile/${userId}`);

	logoutClickListener = () => {
		localStorage.removeItem('token');
		navigateTo('/');
	};
	document.getElementById('logout-button')?.addEventListener('click', logoutClickListener);

	try
	{
		const userProfile = await getUserProfile(userId);
		if (titleElement)
		{
			const userName = userProfile.name || 'User';
			titleElement.textContent = t('match_history_for_user').replace('{name}', userName);
		}
		const matches = await getMatchHistory(userId);
		listContainer.innerHTML = '';
		statsDashboard.innerHTML = '';

		if (matches.length === 0)
		{
			listContainer.innerHTML = `<p class="text-center text-slate-400">${t('no_matches_found')}</p>`;
			statsDashboard.innerHTML = `<p class="text-center text-slate-400">${t('no_stats_available')}</p>`;
			return ;
		}

		const profileOwnerId = parseInt(userId, 10);

		// Sort matches by date, most recent first
		matches.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		// Calculate aggregate stats
		let totalWins = 0;
		let totalScoreFor = 0;
		let totalScoreAgainst = 0;
		let currentWinStreak = 0;

		// Calculate win streak
		for (const match of matches) {
			if (match.winnerId === profileOwnerId) {
				currentWinStreak++;
			} else {
				break;
			}
		}

		matches.forEach((match: any) => {
			if (match.winnerId === profileOwnerId) {
				totalWins++;
			}
			const isPlayer1 = match.player1Id === profileOwnerId;
			totalScoreFor += isPlayer1 ? match.team1Score : match.team2Score;
			totalScoreAgainst += isPlayer1 ? match.team2Score : match.team1Score;
		});

		const totalMatches = matches.length;
		const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
		const lastMatchDate = totalMatches > 0 ? new Date(matches[0].createdAt).toLocaleDateString() : t('n_a');

		// Render stats dashboard
		statsDashboard.innerHTML = `
			<h3 class="text-xl font-semibold text-white mb-4">${t('overall_stats')}</h3>
			<div class="grid grid-cols-2 gap-4 text-center">
				<div class="bg-[#363A43] p-4 rounded-lg">
					<p class="text-2xl font-bold text-white">${totalMatches}</p>
					<p class="text-sm text-slate-400">${t('total_matches_summary').replace('{count}', totalMatches)}</p>
				</div>
				<div class="bg-[#363A43] p-4 rounded-lg">
					<p class="text-2xl font-bold text-white">${currentWinStreak}</p>
					<p class="text-sm text-slate-400">${t('win_streak')}</p>
				</div>
				<div class="bg-[#363A43] p-4 rounded-lg">
					<p class="text-2xl font-bold text-white">${lastMatchDate}</p>
					<p class="text-sm text-slate-400">${t('last_match_date')}</p>
				</div>
				<div class="bg-[#363A43] p-4 rounded-lg">
					<p class="text-2xl font-bold text-white">${winRate.toFixed(1)}%</p>
					<p class="text-sm text-slate-400 mb-1">${t('win_rate')}</p>
					<div class="w-full bg-slate-500 rounded-full h-2.5"><div class="bg-green-500 h-2.5 rounded-full" style="width: ${winRate}%"></div></div>
				</div>
				<div class="bg-[#363A43] p-4 rounded-lg col-span-2">
					<div class="flex justify-around">
						<div>
							<p class="text-2xl font-bold text-green-400">${totalScoreFor}</p>
							<p class="text-sm text-slate-400">${t('total_score_for')}</p>
						</div>
						<div>
							<p class="text-2xl font-bold text-red-400">${totalScoreAgainst}</p>
							<p class="text-sm text-slate-400">${t('total_score_against')}</p>
						</div>
					</div>
				</div>
			</div>
		`;

		matches.forEach((match: any) =>
		{
			const isPlayer1 = match.player1Id === profileOwnerId;
			const myData = isPlayer1 ? match.player1 : match.player2;
			const opponentData = isPlayer1 ? match.player2 : match.player1;
			
			const myStats = isPlayer1 
				? { score: match.team1Score, hits: match.team1Hits, misses: match.team1Misses }
				: { score: match.team2Score, hits: match.team2Hits, misses: match.team2Misses };
			const opponentStats = isPlayer1
				? { score: match.team2Score, hits: match.team2Hits, misses: match.team2Misses }
				: { score: match.team1Score, hits: match.team1Hits, misses: match.team1Misses };

			const iWon = match.winnerId === profileOwnerId;
		
			const matchElement = document.createElement('div');
			matchElement.className = `bg-[#272A33] p-4 rounded-xl shadow-lg flex items-center justify-between relative`;

			matchElement.innerHTML = `
				<div class="absolute left-0 top-0 bottom-0 w-2 ${iWon ? 'bg-green-500' : 'bg-red-500'} rounded-l-xl"></div>
				<div class="absolute right-0 top-0 bottom-0 w-2 ${!iWon ? 'bg-green-500' : 'bg-red-500'} rounded-r-xl"></div>

				<div class="flex-1 text-center px-2">
					<p class="font-bold text-lg text-white truncate">${myData.name}</p>
					<p class="text-sm ${iWon ? 'text-green-400' : 'text-red-400'} font-bold">${iWon ? t('outcome_win') : t('outcome_lose')}</p>
				</div>

				<div class="text-center border-l border-r border-slate-700/50 px-4 mx-4">
					<p class="text-4xl font-bold text-white">
						<span>${myStats.score}</span> - <span>${opponentStats.score}</span>
					</p>
					<p class="text-xs text-slate-400 mt-2">${new Date(match.createdAt).toLocaleString()}</p>
					<p class="text-xs text-slate-400">${t('stat_duration')}: ${formatDuration(match.durationInSeconds)}</p>
					${match.wasForfeit ? `<p class="text-xs text-yellow-400 font-bold mt-1">${t('forfeit_tag')}</p>` : ''}
				</div>

				<div class="flex-1 text-center px-2">
					<p class="font-bold text-lg text-white truncate">${opponentData.name}</p>
					<p class="text-sm ${!iWon ? 'text-green-400' : 'text-red-400'} font-bold">${!iWon ? t('outcome_win') : t('outcome_lose')}</p>
				</div>
			`;
			listContainer.appendChild(matchElement);
		});

	}
	catch (error)
	{
		console.error(error);
		listContainer.innerHTML = `<p class="text-center text-red-500">${t('history_load_error')}</p>`;
	}
}

export function cleanup()
{
	if (logoutClickListener) {
		document.getElementById('logout-button')?.removeEventListener('click', logoutClickListener);
		logoutClickListener = null;
	}
}