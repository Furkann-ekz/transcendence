// frontend/src/pages/OnlineGamePage.ts
import { getSocket } from '../socket';
import { navigateTo } from '../router';
import type { Socket } from 'socket.io-client';
import { jwt_decode } from '../utils';

// Modül kapsamındaki değişkenler
let socket: Socket | null = null;
let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let gameState: any = {};
let playerIsLeft: boolean = true;
let animationFrameId: number;

// Tip Tanımlaması
type Player = {
  id: number;
  paddleY: number;
  isLeft: boolean;
};

// Çizim Fonksiyonu
function renderGame() {
    if (!context || !gameState.players) return;
    const { players, ballX, ballY, leftScore, rightScore } = gameState;
    const PADDLE_WIDTH = 10, PADDLE_HEIGHT = 100, BALL_SIZE = 10;
    
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'white';
    context.font = "75px sans-serif";
    context.fillText(leftScore.toString(), canvas.width / 4, canvas.height / 5);
    context.fillText(rightScore.toString(), 3 * canvas.width / 4, canvas.height / 5);

    const leftPlayer = players.find((p: Player) => p.isLeft);
    const rightPlayer = players.find((p: Player) => !p.isLeft);

    if (leftPlayer) context.fillRect(0, leftPlayer.paddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
    if (rightPlayer) context.fillRect(canvas.width - PADDLE_WIDTH, rightPlayer.paddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    context.beginPath();
    context.arc(ballX, ballY, BALL_SIZE, 0, Math.PI * 2);
    context.fill();
}

// Oyun Döngüsü
function gameLoop() {
    renderGame();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Klavye Olay Yöneticisi
function handleKeyDown(event: KeyboardEvent) {
    if (!socket || !gameState.players) return;
    let newY;
    
    const player = gameState.players.find((p: Player) => p.isLeft === playerIsLeft);
    if (!player) return;

    if ((player.isLeft && (event.key === 'w' || event.key === 's')) || 
        (!player.isLeft && (event.key === 'ArrowUp' || event.key === 'ArrowDown'))) 
    {
        if (event.key === 'w' || event.key === 'ArrowUp') {
            newY = player.paddleY - 30;
        } else if (event.key === 's' || event.key === 'ArrowDown') {
            newY = player.paddleY + 30;
        }
        
        if (newY !== undefined) {
            socket.emit('playerMove', { paddleY: newY });
        }
    }
}

// HTML'i oluşturan ana fonksiyon
export function render() {
    return `
    <div class="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center">
      <div id="game-status" class="text-3xl text-white mb-4">Rakip Bekleniyor...</div>
      <canvas id="pong-canvas" width="800" height="600" class="bg-black border border-white hidden"></canvas>
      <a href="/lobby" data-link class="mt-4 text-blue-400">Lobiden Ayrıl</a>
    </div>
  `;
}

// Sayfa yüklendikten sonra çalışan mantık
export function afterRender() {
    socket = getSocket();
    if (!socket) { navigateTo('/'); return; }
    
    const statusDiv = document.getElementById('game-status')!;
    const canvasEl = document.getElementById('pong-canvas') as HTMLCanvasElement;
    canvas = canvasEl;
    context = canvas.getContext('2d')!;
    const token = localStorage.getItem('token');

    // Dinleyici fonksiyonlarını tanımla
    const onWaiting = () => statusDiv.textContent = 'Rakip Bekleniyor...';
    const onGameStart = ({ players }: { players: any[] }) => {
        statusDiv.textContent = '';
        canvas.classList.remove('hidden');
        const myData = players.find((p: any) => p.id === jwt_decode(token!).userId);
        if (myData) playerIsLeft = myData.isLeft;
        window.addEventListener('keydown', handleKeyDown);
        gameLoop();
    };
    const onGameStateUpdate = (newGameState: any) => gameState = newGameState;
    const onOpponentLeft = () => {
        statusDiv.textContent = 'Rakibin oyundan ayrıldı! Oyun Bitti.';
        window.removeEventListener('keydown', handleKeyDown);
        cancelAnimationFrame(animationFrameId); // Çizim döngüsünü durdur
        if (socket) socket.off('gameStateUpdate', onGameStateUpdate); // Güncellemeleri dinlemeyi bırak
    };

    // Olay dinleyicilerini ekle
    socket.on('waitingForPlayer', onWaiting);
    socket.on('gameStart', onGameStart);
    socket.on('gameStateUpdate', onGameStateUpdate);
    socket.on('opponentLeft', onOpponentLeft);
}


// Sayfadan ayrılırken çalışan temizlik fonksiyonu
export function cleanup() {
    if (socket) {
      socket.off('waitingForPlayer');
      socket.off('gameStart');
      socket.off('gameStateUpdate');
      socket.off('opponentLeft');
    }
    window.removeEventListener('keydown', handleKeyDown);
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}