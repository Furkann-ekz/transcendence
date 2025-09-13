import { t } from '../i18n';
import { getMatchHistory } from '../api/users';

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
        <!-- Maçlar buraya yüklenecek -->
        <p>Loading history...</p>
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
        const matches = await getMatchHistory(userId);
        listContainer.innerHTML = ''; // "Loading..." yazısını temizle

        if (matches.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-gray-500">No matches found.</p>';
            return;
        }

        const profileOwnerId = parseInt(userId, 10);
        titleElement.textContent = `${matches[0].player1Id === profileOwnerId ? matches[0].player1.name : matches[0].player2.name}'s Match History`;


        matches.forEach((match: any) => {
            const isPlayer1 = match.player1Id === profileOwnerId;
            const myData = isPlayer1 ? match.player1 : match.player2;
            const opponentData = isPlayer1 ? match.player2 : match.player1;
            const myStats = { score: match.player1Score, hits: match.player1Hits, misses: match.player1Misses };
            const opponentStats = { score: match.player2Score, hits: match.player2Hits, misses: match.player2Misses };
            const iWon = match.winnerId === profileOwnerId;

            const myTotalShots = myStats.hits + myStats.misses;
            const myAccuracy = myTotalShots > 0 ? ((myStats.hits / myTotalShots) * 100).toFixed(0) : 0;
            
            const opponentTotalShots = opponentStats.hits + opponentStats.misses;
            const opponentAccuracy = opponentTotalShots > 0 ? ((opponentStats.hits / opponentTotalShots) * 100).toFixed(0) : 0;

            const matchElement = document.createElement('div');
            matchElement.className = `bg-white p-4 rounded-lg shadow-md flex items-center justify-between border-l-8 ${iWon ? 'border-green-500' : 'border-red-500'}`;
            
            matchElement.innerHTML = `
                <!-- Benim Bilgilerim -->
                <div class="text-center">
                    <p class="font-bold text-lg">${myData.name}</p>
                    <p class="text-sm text-gray-500">Accuracy: ${myAccuracy}%</p>
                </div>

                <!-- Orta Alan: Skor ve Detaylar -->
                <div class="text-center">
                    <p class="text-3xl font-bold">
                        <span class="${iWon ? 'text-green-500' : 'text-red-500'}">${myStats.score}</span>
                        -
                        <span class="${!iWon ? 'text-green-500' : 'text-red-500'}">${opponentStats.score}</span>
                    </p>
                    <p class="text-xs text-gray-400">${new Date(match.createdAt).toLocaleDateString()}</p>
                    <p class="text-xs text-gray-400">Duration: ${formatDuration(match.durationInSeconds)}</p>
                </div>

                <!-- Rakip Bilgileri -->
                <div class="text-center">
                    <p class="font-bold text-lg">${opponentData.name}</p>
                    <p class="text-sm text-gray-500">Accuracy: ${opponentAccuracy}%</p>
                </div>
            `;
            listContainer.appendChild(matchElement);
        });

    } catch (error) {
        console.error(error);
        listContainer.innerHTML = '<p class="text-center text-red-500">Failed to load match history.</p>';
    }
}