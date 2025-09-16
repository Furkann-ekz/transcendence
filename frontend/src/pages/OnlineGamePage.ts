// frontend/src/pages/OnlineGamePage.ts
import { getSocket } from '../socket';
import type { Socket } from 'socket.io-client';
import { jwt_decode } from '../utils';
import { t } from '../i18n';

// Sayfa bazında kullanılacak değişkenler
let socket: Socket | null = null;
let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let gameState: any = {};
let gameConfig: any = {}; // Oyun ayarlarını (canvas boyutu, raket boyutu vb.) tutacak
let myPlayer: any = null; // Oyuncunun kendi bilgilerini (pozisyonu, takımı vb.) tutacak
let animationFrameId: number;

// OYUNU ÇİZME FONKSİYONU
function renderGame() {
    if (!context || !gameState.players || !gameConfig.canvasSize) return;

    const { players, ballX, ballY, team1Score, team2Score } = gameState;
    const { canvasSize, paddleSize, paddleThickness } = gameConfig;

    // 1. Arka planı temizle
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvasSize, canvasSize);

    // 2. Skorları çiz
    context.fillStyle = 'white';
    context.font = "75px fantasy";
    context.textAlign = 'center';
    context.fillText(team1Score.toString(), canvasSize / 4, canvasSize / 5);
    context.fillText(team2Score.toString(), (canvasSize * 3) / 4, canvasSize / 5);

    // 3. Dört raketi de pozisyonlarına ve takımlarına göre çiz
    players.forEach((player: any) => {
        context.fillStyle = player.team === 1 ? '#60a5fa' : '#f87171'; // Takım 1 Mavi, Takım 2 Kırmızı
        
        if (player.position === 'left' || player.position === 'right') {
            context.fillRect(player.x, player.y, paddleThickness, paddleSize);
        } else { // 'top' veya 'bottom'
            context.fillRect(player.x, player.y, paddleSize, paddleThickness);
        }
    });

    // 4. Topu çiz
    context.fillStyle = 'white';
    context.beginPath();
    context.arc(ballX, ballY, 10, 0, Math.PI * 2);
    context.fill();
}

// OYUN DÖNGÜSÜ
function gameLoop() {
    renderGame();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// KONTROL MANTIĞI
function handlePlayerMove(event: KeyboardEvent) {
    if (!socket || !myPlayer || !gameState.players) return;

    // Oyuncunun güncel pozisyonunu gameState'den bul
    const playerState = gameState.players.find((p: any) => p.id === myPlayer.id);
    if (!playerState) return;

    let currentPos: number;
    // Oyuncunun pozisyonuna göre hangi eksende hareket ettiğini belirle
    if (myPlayer.position === 'left' || myPlayer.position === 'right') {
        currentPos = playerState.y; // Dikey hareket
    } else {
        currentPos = playerState.x; // Yatay hareket
    }

    let newPos: number | undefined;
    // W/Yukarı Ok -> Yukarı veya Sola hareket
    if (event.key === 'w' || event.key === 'ArrowUp') {
        newPos = currentPos - 25; // Hareketi biraz hızlandıralım
    } 
    // S/Aşağı Ok -> Aşağı veya Sağa hareket
    else if (event.key === 's' || event.key === 'ArrowDown') {
        newPos = currentPos + 25;
    }

    if (newPos !== undefined) {
        // Yeni pozisyonu sunucuya gönder
        socket.emit('playerMove', { newPosition: newPos });
    }
}

// SAYFANIN HTML'İNİ OLUŞTURMA

export function render(): string {
    return `
    <div class="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center relative">
      <div id="game-status" class="text-3xl text-white mb-4">${t('waiting_for_opponent')}</div>
      <canvas id="pong-canvas" width="800" height="800" class="bg-black border border-white"></canvas>
      <a href="/lobby" data-link class="mt-4 text-blue-400 hover:text-blue-300">${t('leave_lobby')}</a>

      <div id="game-over-modal" class="hidden absolute inset-0 bg-black bg-opacity-75 items-center justify-center text-white">
        <h2 id="game-over-text" class="text-6xl font-bold mb-8"></h2>
        <div id="rematch-prompt" class="hidden items-center">
            <p class="text-xl mb-4">${t('rematch_question')}</p>
            <div class="flex space-x-4">
                <button id="stay-button" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded">${t('stay_on_page')}</button>
                <a href="/lobby" data-link class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded">${t('return_to_lobby')}</a>
            </div>
        </div>
      </div>
    </div>
  `;
}


// SAYFA YÜKLENDİKTEN SONRA ÇALIŞAN KODLAR
export function afterRender() {
    socket = getSocket()!;

    const statusDiv = document.getElementById('game-status')!;
    const canvasEl = document.getElementById('pong-canvas') as HTMLCanvasElement;
    canvas = canvasEl;
    context = canvas.getContext('2d')!;
    const gameOverModal = document.getElementById('game-over-modal')!;
    const gameOverText = document.getElementById('game-over-text')!;
    const rematchPrompt = document.getElementById('rematch-prompt')!;
    const stayButton = document.getElementById('stay-button')!;
    
    const token = localStorage.getItem('token');
    const myUserId = token ? jwt_decode(token).userId : null;

    stayButton.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
    });

    // Sunucudan gelen "bekleme odası güncellendi" mesajını dinle
    socket.on('updateQueue', ({ queueSize, requiredSize }) => {
        statusDiv.textContent = `${t('waiting_for_opponent')} (${queueSize}/${requiredSize})`;
    });

    // Sunucudan gelen "oyun başladı" mesajını dinle
    socket.on('gameStart', (payload) => {
        console.log("Oyun başlıyor:", payload);
        // Sunucudan gelen oyun ayarlarını kaydet
        gameConfig = {
            canvasSize: payload.canvasSize,
            paddleSize: payload.paddleSize,
            paddleThickness: payload.paddleThickness,
            mode: payload.mode
        };
        
        // Canvas boyutlarını ayarla
        canvas.width = gameConfig.canvasSize;
        canvas.height = gameConfig.canvasSize;
        
        statusDiv.textContent = ''; // "Bekleniyor..." yazısını sil
        canvas.classList.remove('hidden'); // Canvas'ı görünür yap
        
        // Oyuncunun kendi bilgilerini bul ve kaydet
        myPlayer = payload.players.find((p: any) => p.id === myUserId);

        // Klavye dinleyicisini başlat
        window.addEventListener('keydown', handlePlayerMove);
        // Oyun döngüsünü başlat
        if (animationFrameId) cancelAnimationFrame(animationFrameId); // Önceki döngüyü temizle
        gameLoop();
    });

    socket.on('gameStateUpdate', (newGameState) => {
        gameState = newGameState;
    });

    socket.on('gameOver', ({ winners }) => {
        window.removeEventListener('keydown', handlePlayerMove);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        
        const isWinner = winners.some((winner: any) => winner.id === myUserId);
        
        gameOverText.textContent = isWinner ? t('you_win') : t('you_lose');
        
        // Görünür yaparken flex class'larını ekliyoruz
        gameOverModal.classList.remove('hidden');
        gameOverModal.classList.add('flex', 'flex-col');

        setTimeout(() => {
            // Görünür yaparken flex class'larını ekliyoruz
            rematchPrompt.classList.remove('hidden');
            rematchPrompt.classList.add('flex', 'flex-col');
        }, 3000);
    });
}

// SAYFADAN AYRILIRKEN ÇALIŞAN TEMİZLİK KODLARI
export function cleanup() {
    if (socket) {
      socket.emit('leaveGameOrLobby');
      // Bu sayfaya özel dinleyicileri kaldır
      socket.off('updateQueue');
      socket.off('gameStart');
      socket.off('gameStateUpdate');
      socket.off('opponentLeft');
    }
    // Genel klavye dinleyicisini kaldır
    window.removeEventListener('keydown', handlePlayerMove);
    // Oyun döngüsünü durdur
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    // Değişkenleri sıfırla
    animationFrameId = 0;
    myPlayer = null;
    gameConfig = {};
    gameState = {};
}