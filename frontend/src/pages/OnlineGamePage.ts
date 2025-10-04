// frontend/src/pages/OnlineGamePage.ts

import { getSocket } from '../socket';
import type { Socket } from 'socket.io-client';
import { jwt_decode } from '../utils';
import { t } from '../i18n';

interface Player { id: number; name: string; email: string; socketId: string; position: 'left' | 'right' | 'top' | 'bottom'; team: 1 | 2; x: number; y: number; }
interface GameConfig { canvasSize: number; paddleSize: number; paddleThickness: number; mode: string; tournamentId?: string; }
interface GameState { ballX?: number; ballY?: number; team1Score?: number; team2Score?: number; players?: Player[]; }
interface GameStartPayload extends GameConfig { players: Player[]; }
interface UpdateQueuePayload { queueSize: number; requiredSize: number; }
interface GameOverPayload { winners: Player[]; losers: Player[]; reason:string; }

let socket: Socket | null = null;
let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let gameState: GameState = {};
let gameConfig: GameConfig | null = null;
let myPlayer: Player | null = null;
let animationFrameId: number;

function renderGame() {
    if (!context || !gameState.players || !gameConfig?.canvasSize) return;
    const { players, ballX, ballY, team1Score, team2Score } = gameState;
    const { canvasSize, paddleSize, paddleThickness } = gameConfig;
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvasSize, canvasSize);
    context.fillStyle = 'white';
    context.font = "75px fantasy";
    context.textAlign = 'center';
    context.fillText(String(team1Score ?? 0), canvasSize / 4, canvasSize / 5);
    context.fillText(String(team2Score ?? 0), (canvasSize * 3) / 4, canvasSize / 5);
    players.forEach((player: Player) => {
        context.fillStyle = player.team === 1 ? '#60a5fa' : '#f87171';
        if (player.position === 'left' || player.position === 'right') {
            context.fillRect(player.x, player.y, paddleThickness, paddleSize);
        } else {
            context.fillRect(player.x, player.y, paddleSize, paddleThickness);
        }
    });
    if (ballX !== undefined && ballY !== undefined) {
      context.fillStyle = 'white';
      context.beginPath();
      context.arc(ballX, ballY, 10, 0, Math.PI * 2);
      context.fill();
    }
}

function gameLoop() {
    renderGame();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function handlePlayerMove(event: KeyboardEvent) {
    if (!socket || !myPlayer || !gameState.players) return;
    const playerState = gameState.players.find((p: Player) => p.id === myPlayer!.id);
    if (!playerState) return;
    let currentPos: number;
    if (myPlayer.position === 'left' || myPlayer.position === 'right') {
        currentPos = playerState.y;
    } else {
        currentPos = playerState.x;
    }
    let newPos: number | undefined;
    if (event.key === 'w' || event.key === 'ArrowUp') {
        newPos = currentPos - 25;
    } else if (event.key === 's' || event.key === 'ArrowDown') {
        newPos = currentPos + 25;
    }
    if (newPos !== undefined) {
        socket.emit('playerMove', { newPosition: newPos });
    }
}

function initializeGame(payload: GameStartPayload) {
    const statusDiv = document.getElementById('game-status')!;
    const token = localStorage.getItem('token');
    const myUserId = token ? jwt_decode(token).userId : null;
    
    gameConfig = { ...payload };
    canvas.width = gameConfig.canvasSize;
    canvas.height = gameConfig.canvasSize;
    statusDiv.textContent = '';
    canvas.classList.remove('hidden');
    myPlayer = payload.players.find((p: Player) => p.id === myUserId) || null;

    window.addEventListener('keydown', handlePlayerMove);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

export function render(): string {
    return `
    <div class="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center relative">
      <div id="game-status" class="text-3xl text-white mb-4"></div>
      <canvas id="pong-canvas" width="800" height="800" class="bg-black border border-white hidden"></canvas>
      <a href="/lobby" data-link class="mt-4 text-blue-400 hover:text-blue-300">${t('leave_lobby')}</a>

      <div id="game-over-modal" class="hidden absolute inset-0 bg-black bg-opacity-75 items-center justify-center text-white">
        <h2 id="game-over-text" class="text-6xl font-bold mb-8"></h2>
        <div id="rematch-prompt" class="hidden items-center flex-col">
            <p class="text-xl mb-4">${t('rematch_question')}</p>
            <div class="flex space-x-4">
                <button id="stay-button" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded">${t('stay_on_page')}</button>
                <a id="return-link" href="/lobby" data-link class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded">
                    ${t('return_to_lobby')}
                </a>
            </div>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
    socket = getSocket()!;
    const canvasEl = document.getElementById('pong-canvas') as HTMLCanvasElement;
    canvas = canvasEl;
    context = canvas.getContext('2d')!;
    const gameOverModal = document.getElementById('game-over-modal')!;
    const gameOverText = document.getElementById('game-over-text')!;
    const rematchPrompt = document.getElementById('rematch-prompt')!;
    const stayButton = document.getElementById('stay-button')!;
    const statusDiv = document.getElementById('game-status')!;
    const token = localStorage.getItem('token');
    const myUserId = token ? jwt_decode(token).userId : null;
    const returnLink = document.getElementById('return-link') as HTMLAnchorElement;

    // DEĞİŞİKLİK: Turnuva ID'sini tarayıcı hafızasından oku
    const activeTournamentId = sessionStorage.getItem('activeTournamentId');

    // Arayüzü Sıfırla
    gameOverModal.classList.add('hidden');
    gameOverModal.classList.remove('flex', 'flex-col');
    rematchPrompt.classList.add('hidden');
    canvasEl.classList.add('hidden');
    statusDiv.textContent = t('waiting_for_opponent');

    stayButton.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        gameOverModal.classList.remove('flex', 'flex-col');
    });

    socket.emit('client_ready_for_game');

    socket.on('gameStart', (payload: GameStartPayload) => {
        initializeGame(payload);
    });

    socket.on('updateQueue', ({ queueSize, requiredSize }: UpdateQueuePayload) => {
        statusDiv.textContent = `${t('waiting_for_opponent')} (${queueSize}/${requiredSize})`;
    });

    socket.on('gameStateUpdate', (newGameState: GameState) => {
        gameState = newGameState;
    });

    socket.on('gameOver', ({ winners }: GameOverPayload) => {
        window.removeEventListener('keydown', handlePlayerMove);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        
        const isWinner = winners.some((winner: Player) => winner.id === myUserId);
        
        gameOverText.textContent = isWinner ? t('you_win') : t('you_lose');
        gameOverModal.classList.remove('hidden');
        gameOverModal.classList.add('flex', 'flex-col');

        // DEĞİŞİKLİK: Butonu, hafızadan okuduğumuz 'activeTournamentId'ye göre ayarla
        if (activeTournamentId) {
            returnLink.textContent = t('return_to_tournament');
            returnLink.href = `/tournament/${activeTournamentId}/play`;
            // Turnuva bittiğine göre hafızayı temizleyelim
            sessionStorage.removeItem('activeTournamentId');
        } else {
            returnLink.textContent = t('return_to_lobby');
            returnLink.href = '/lobby';
        }

        setTimeout(() => {
            rematchPrompt.classList.remove('hidden');
            rematchPrompt.classList.add('flex', 'flex-col');
        }, 3000);
    });
}

export function cleanup() {
    if (socket) {
      socket.emit('leaveGameOrLobby');
      socket.off('updateQueue');
      socket.off('gameStart');
      socket.off('gameStateUpdate');
      socket.off('gameOver');
    }
    window.removeEventListener('keydown', handlePlayerMove);
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = 0;
    myPlayer = null;
    gameConfig = null;
    gameState = {};
}