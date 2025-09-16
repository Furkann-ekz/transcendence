import { t } from '../i18n';
import { getMatchHistory } from '../api/users';
import { getUserProfile } from '../api/users'; // Kullanıcı adını almak için bunu da import ediyoruz

// Yardımcı fonksiyon: Saniyeyi "dakika:saniye" formatına çevirir
function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function render(): string {
  return `
    <div class="min-h-screen bg-gray-100 p-4 sm:p-8">
      <h1 id="history-title" class="text-3xl font-bold mb-6 text-center text-gray-800">${t('match_history_title')}</h1>
      <div id="match-history-list" class="space-y-4 max-w-4xl mx-auto">
        <p class="text-center text-gray-500">${t('loading_history')}</p>
      </div>
       <div class="text-center mt-8">
         <a id="back-to-profile-link" href="#" data-link class="text-blue-500 hover:text-blue-800">${t('back_button')}</a>
      </div>
    </div>
  `;
}

export async function afterRender() {
    const listContainer = document.getElementById('match-history-list');
    const titleElement = document.getElementById('history-title');
    const backLink = document.getElementById('back-to-profile-link');

    const pathParts = window.location.pathname.split('/');
    const userId = pathParts[2];

    if (!listContainer || !userId || !titleElement || !backLink) return;
    
    backLink.setAttribute('href', `/profile/${userId}`);

    try {
        const userProfile = await getUserProfile(userId);
        if (titleElement) {
            const userName = userProfile.name || 'User';
            titleElement.textContent = t('match_history_for_user').replace('{name}', userName);
        }
        const matches = await getMatchHistory(userId);
        listContainer.innerHTML = '';

        if (matches.length === 0) {
            listContainer.innerHTML = `<p class="text-center text-gray-500">${t('no_matches_found')}</p>`;
            return;
        }

        const profileOwnerId = parseInt(userId, 10);

        matches.forEach((match: any) => {
            const isPlayer1 = match.player1Id === profileOwnerId;
            const myData = isPlayer1 ? match.player1 : match.player2;
            const opponentData = isPlayer1 ? match.player2 : match.player1;
            
            const myStats = isPlayer1 
                ? { score: match.player1Score, hits: match.player1Hits, misses: match.player1Misses }
                : { score: match.player2Score, hits: match.player2Hits, misses: match.player2Misses };
            const opponentStats = isPlayer1
                ? { score: match.player2Score, hits: match.player2Hits, misses: match.player2Misses }
                : { score: match.player1Score, hits: match.player1Hits, misses: match.player1Misses };

            const iWon = match.winnerId === profileOwnerId;

            const myTotalShots = myStats.hits + myStats.misses;
            const myAccuracy = myTotalShots > 0 ? ((myStats.hits / myTotalShots) * 100).toFixed(0) : 0;
            
            const opponentTotalShots = opponentStats.hits + opponentStats.misses;
            const opponentAccuracy = opponentTotalShots > 0 ? ((opponentStats.hits / opponentTotalShots) * 100).toFixed(0) : 0;

            const matchElement = document.createElement('div');
            matchElement.className = `bg-white p-4 rounded-lg shadow-md flex items-center justify-between border-l-8 ${iWon ? 'border-green-500' : 'border-red-500'}`;
            
            matchElement.innerHTML = `
                <div class="flex-1 text-center">
                    <p class="font-bold text-lg">${myData.name} ${iWon ? `(${t('you_suffix')})` : ''}</p>
                    <p class="text-sm ${iWon ? 'text-green-600' : 'text-red-600'} font-bold">${iWon ? t('outcome_win') : t('outcome_lose')}</p>
                    <div class="mt-2 text-xs text-gray-500">
                        <p>${t('stat_accuracy')}: ${myAccuracy}%</p>
                        <p>${t('stat_missed')}: ${myStats.misses}</p>
                    </div>
                </div>

                <div class="text-center border-l border-r px-4 mx-4">
                    <p class="text-4xl font-bold">
                        <span>${myStats.score}</span> - <span>${opponentStats.score}</span>
                    </p>
                    <p class="text-xs text-gray-400 mt-2">${new Date(match.createdAt).toLocaleString()}</p>
                    <p class="text-xs text-gray-400">${t('stat_duration')}: ${formatDuration(match.durationInSeconds)}</p>
                </div>

                <div class="flex-1 text-center">
                    <p class="font-bold text-lg">${opponentData.name}</p>
                    <p class="text-sm ${!iWon ? 'text-green-600' : 'text-red-600'} font-bold">${!iWon ? t('outcome_win') : t('outcome_lose')}</p>
                     <div class="mt-2 text-xs text-gray-500">
                        <p>${t('stat_accuracy')}: ${opponentAccuracy}%</p>
                        <p>${t('stat_missed')}: ${opponentStats.misses}</p>
                    </div>
                </div>
            `;
            listContainer.appendChild(matchElement);
        });

    } catch (error) {
        console.error(error);
        listContainer.innerHTML = `<p class="text-center text-red-500">${t('history_load_error')}</p>`;
    }
}