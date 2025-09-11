// frontend/src/pages/OnlineGamePage.ts
import { getSocket } from '../socket'; // Merkezi soketi import et
import type { Socket } from 'socket.io-client';
import { jwt_decode } from '../utils';

let socket: Socket | null = null;
let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let gameState: any = {};
let playerIsLeft: boolean = true;
let animationFrameId: number;

type Player = {
  id: number;
  paddleY: number;
  isLeft: boolean;
};

function renderGame() {
    if (!context || !gameState.players) return;
    const { players, ballX, ballY, leftScore, rightScore } = gameState;
    const PADDLE_WIDTH = 10, PADDLE_HEIGHT = 100, BALL_SIZE = 10;
    
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'white';
    context.font = "75px fantasy";
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

function gameLoop() {
    renderGame();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function handleKeyDown(event: KeyboardEvent) {
    if (!socket || !gameState.players)
        return;
    let newY;
    
    const player = gameState.players.find((p: Player) => p.isLeft === playerIsLeft);
    if (!player) return;

    // Sadece kendi raketimizi kontrol etmemize izin ver
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

export function render() {
    return `
    <div class="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center">
      <div id="game-status" class="text-3xl text-white mb-4">Rakip Bekleniyor...</div>
      <canvas id="pong-canvas" width="800" height="600" class="bg-black border border-white hidden"></canvas>
      <a href="/lobby" data-link class="mt-4 text-blue-400">Lobiden Ayrıl</a>
    </div>
  `;
}

export function afterRender() {
    // DÜZELTME: Yeni soket oluşturmak yerine mevcut olanı alıyoruz
    socket = getSocket()!;

    socket.emit('joinMatchmaking');
    
    const statusDiv = document.getElementById('game-status')!;
    const canvasEl = document.getElementById('pong-canvas') as HTMLCanvasElement;
    canvas = canvasEl;
    context = canvas.getContext('2d')!;
    
    const token = localStorage.getItem('token');

    socket.on('waitingForPlayer', () => {
        statusDiv.textContent = 'Rakip Bekleniyor...';
    });

    socket.on('gameStart', ({ players }) => {
        statusDiv.textContent = ''; // Veya skorları gösterebiliriz
        canvas.classList.remove('hidden');
        
        const myData = players.find((p: any) => p.id === jwt_decode(token!).userId);
        if (myData) playerIsLeft = myData.isLeft;

        window.addEventListener('keydown', handleKeyDown);
        gameLoop(); // Oyun döngüsünü burada başlat
    });

    socket.on('gameStateUpdate', (newGameState) => {
        gameState = newGameState;
    });

    socket.on('opponentLeft', () => {
        statusDiv.textContent = 'Rakibin oyundan ayrıldı!';
        window.removeEventListener('keydown', handleKeyDown);
        cancelAnimationFrame(animationFrameId);
    });
}

export function cleanup() {
    if (!socket)
        return;
    if (socket) {
      // --- YENİ EKLENECEK SATIR ---
      // Sunucuya lobiden veya oyundan ayrıldığımızı bildiriyoruz.
      socket.emit('leaveGameOrLobby');

      // Mevcut event dinleyicilerini temizleyelim.
      socket.off('waitingForPlayer');
      socket.off('gameStart');
      socket.off('gameStateUpdate');
      socket.off('opponentLeft');
    }
    window.removeEventListener('keydown', handleKeyDown);
    if (animationFrameId) { // animationFrameId tanımlıysa iptal et
        cancelAnimationFrame(animationFrameId);
    }
}