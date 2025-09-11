// frontend/src/pages/OnlineGamePage.ts
import { getSocket } from '../socket';
import type { Socket } from 'socket.io-client';
import { jwt_decode } from '../utils';
import { t } from '../i18n';

let socket: Socket | null = null;
let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let gameState: any = {};
let gameConfig: any = {};
let myPlayer: any = null;
let animationFrameId: number;

function renderGame() {
    if (!context || !gameState.players || !gameConfig.canvasSize) return;
    const { players, ballX, ballY, team1Score, team2Score } = gameState;
    const { canvasSize, paddleSize, paddleThickness } = gameConfig;

    // Arka planı çiz
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvasSize, canvasSize);

    // Skorları çiz
    context.fillStyle = 'white';
    context.font = "75px fantasy";
    context.textAlign = 'center';
    context.fillText(team1Score.toString(), canvasSize / 4, canvasSize / 5);
    context.fillText(team2Score.toString(), 3 * canvasSize / 4, canvasSize / 5);

    // Raketleri çiz
    players.forEach((player: any) => {
        context.fillStyle = player.team === 1 ? '#60a5fa' : '#f87171'; // Mavi vs Kırmızı
        if (player.position === 'left' || player.position === 'right') {
            context.fillRect(player.x, player.y, paddleThickness, paddleSize);
        } else { // top or bottom
            context.fillRect(player.x, player.y, paddleSize, paddleThickness);
        }
    });

    // Topu çiz
    context.fillStyle = 'white';
    context.beginPath();
    context.arc(ballX, ballY, 10, 0, Math.PI * 2);
    context.fill();
}

function gameLoop() {
    renderGame();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function handlePlayerMove(event: KeyboardEvent) {
    if (!socket || !myPlayer) return;

    let currentPos, newPos;
    
    // Mevcut pozisyonu al
    if (myPlayer.position === 'left' || myPlayer.position === 'right') {
        currentPos = gameState.players.find((p:any) => p.id === myPlayer.id)?.y;
    } else {
        currentPos = gameState.players.find((p:any) => p.id === myPlayer.id)?.x;
    }
    if(currentPos === undefined) return;

    // Yeni pozisyonu hesapla
    if (event.key === 'w' || event.key === 'ArrowUp') {
        newPos = currentPos - 20;
    } else if (event.key === 's' || event.key === 'ArrowDown') {
        newPos = currentPos + 20;
    }

    if (newPos !== undefined) {
        socket.emit('playerMove', { newPosition: newPos });
    }
}

export function render() {
    return `
    <div class="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center">
      <div id="game-status" class="text-3xl text-white mb-4">${t('waiting_for_opponent')}</div>
      <canvas id="pong-canvas" class="bg-black border border-white hidden"></canvas>
      <a href="/lobby" data-link class="mt-4 text-blue-400 hover:text-blue-300">${t('leave_lobby')}</a>
    </div>
  `;
}

export function afterRender() {
    socket = getSocket()!;
    
    const statusDiv = document.getElementById('game-status')!;
    const canvasEl = document.getElementById('pong-canvas') as HTMLCanvasElement;
    canvas = canvasEl;
    context = canvas.getContext('2d')!;
    
    const token = localStorage.getItem('token');
    const myUserId = token ? jwt_decode(token).userId : null;

    socket.on('updateQueue', ({ queueSize, requiredSize }) => {
        statusDiv.textContent = `${t('waiting_for_opponent')} (${queueSize}/${requiredSize})`;
    });

    socket.on('gameStart', (payload) => {
        gameConfig = {
            canvasSize: payload.canvasSize,
            paddleSize: payload.paddleSize,
            paddleThickness: payload.paddleThickness,
            mode: payload.mode
        };
        
        canvas.width = gameConfig.canvasSize;
        canvas.height = gameConfig.canvasSize;
        
        statusDiv.textContent = '';
        canvas.classList.remove('hidden');
        
        myPlayer = payload.players.find((p: any) => p.id === myUserId);

        window.addEventListener('keydown', handlePlayerMove);
        gameLoop();
    });

    socket.on('gameStateUpdate', (newGameState) => {
        gameState = newGameState;
    });

    socket.on('opponentLeft', () => {
        statusDiv.textContent = t('opponent_left');
        window.removeEventListener('keydown', handlePlayerMove);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    });
}

export function cleanup() {
    if (socket) {
      socket.emit('leaveGameOrLobby');
      socket.off('updateQueue');
      socket.off('gameStart');
      socket.off('gameStateUpdate');
      socket.off('opponentLeft');
    }
    window.removeEventListener('keydown', handlePlayerMove);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
}
