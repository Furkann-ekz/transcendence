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
    <div class="min-h-screen bg-gray-100 p-8">
      <h1 id="history-title" class="text-3xl font-bold mb-6 text-center">Match History</h1>
      <div id="match-history-list" class="space-y-4 max-w-4xl mx-auto">
        <p class="text-center text-gray-500">Loading history...</p>
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
    const userId = pathParts[2]; // /profile/:id/history

    if (!listContainer || !userId || !titleElement || !backLink) return;
    
    backLink.setAttribute('href', `/profile/${userId}`);

    try {
        // Sayfa başlığı için kullanıcının adını al
        const userProfile = await getUserProfile(userId);
        titleElement.textContent = `${userProfile.name || 'User'}'s Match History`;

        const matches = await getMatchHistory(userId);
        listContainer.innerHTML = '';

        if (matches.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-gray-500">No matches found.</p>';
            return;
        }

        const profileOwnerId = parseInt(userId, 10);

        matches.forEach((match: any) => {
            const isPlayer1 = match.player1Id === profileOwnerId;
            const myData = isPlayer1 ? match.player1 : match.player2;
            const opponentData = isPlayer1 ? match.player2 : match.player1;
            
            // Veritabanı modelimize göre doğru istatistikleri al
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
            matchElement.className = `bg-white p-6 rounded-lg shadow-md flex items-center justify-between border-l-8 ${iWon ? 'border-green-500' : 'border-red-500'}`;
            
            matchElement.innerHTML = `
                <div class="w-1/3 text-center">
                    <p class="font-bold text-lg">${myData.name}</p>
                    <p class="text-sm text-gray-500">Accuracy: ${myAccuracy}%</p>
                    <p class="text-xs text-gray-400">Missed: ${myStats.misses}</p>
                </div>

                <div class="w-1/3 text-center border-l border-r">
                    <p class="text-4xl font-bold mb-2">
                        <span class="${iWon ? 'text-green-500' : 'text-gray-600'}">${myStats.score}</span>
                        -
                        <span class="${!iWon ? 'text-green-500' : 'text-gray-600'}">${opponentStats.score}</span>
                    </p>
                    <p class="text-sm font-semibold ${iWon ? 'text-green-500' : 'text-red-500'}">${iWon ? 'WIN' : 'LOSE'}</p>
                    <p class="text-xs text-gray-400 mt-2">${new Date(match.createdAt).toLocaleString()}</p>
                    <p class="text-xs text-gray-400">Duration: ${formatDuration(match.durationInSeconds)}</p>
                </div>

                <div class="w-1/3 text-center">
                    <p class="font-bold text-lg">${opponentData.name}</p>
                    <p class="text-sm text-gray-500">Accuracy: ${opponentAccuracy}%</p>
                    <p class="text-xs text-gray-400">Missed: ${opponentStats.misses}</p>
                </div>
            `;
            listContainer.appendChild(matchElement);
        });

    } catch (error) {
        console.error(error);
        listContainer.innerHTML = '<p class="text-center text-red-500">Failed to load match history.</p>';
    }
}