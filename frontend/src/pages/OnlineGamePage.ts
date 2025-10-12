import { getSocket } from '../socket';
import type { Socket } from 'socket.io-client';
import { jwt_decode } from '../utils';
import { t } from '../i18n';
import { navigateTo } from '../router';

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
let myUserId: number | null;

const keysPressed: { [key: string]: boolean } = {};
let movementInterval: number | null = null;

const myPaddlePattern = createDottedPattern('#ffde59', '#333');

function createDottedPattern(dotColor: string, bgColor: string): CanvasPattern | string
{
	const patternCanvas = document.createElement('canvas');
	const patternContext = patternCanvas.getContext('2d');
	
	if (!patternContext)
		return (bgColor);

	patternCanvas.width = 16;
	patternCanvas.height = 16;

	patternContext.fillStyle = bgColor;
	patternContext.fillRect(0, 0, patternCanvas.width, patternCanvas.height);

	patternContext.beginPath();
	patternContext.arc(8, 8, 3, 0, 2 * Math.PI);
	patternContext.fillStyle = dotColor;
	patternContext.fill();

	return (patternContext.createPattern(patternCanvas, 'repeat')!);
}

function renderGame()
{
	if (!context || !gameState.players || !gameConfig?.canvasSize)
		return ;
	const { players, ballX, ballY, team1Score, team2Score } = gameState;
	const { canvasSize, paddleSize, paddleThickness } = gameConfig;

	context.fillStyle = 'black';
	context.fillRect(0, 0, canvasSize, canvasSize);

	context.fillStyle = 'white';
	context.font = "75px Arial";
	context.textAlign = 'center';
	context.fillText(String(team1Score ?? 0), canvasSize / 4, canvasSize / 5);
	context.fillText(String(team2Score ?? 0), (canvasSize * 3) / 4, canvasSize / 5);

	context.font = "16px Arial";
	const team1Players = players.filter(p => p.team === 1).map(p => p.name).join(' & ');
	const team2Players = players.filter(p => p.team === 2).map(p => p.name).join(' & ');

	context.fillStyle = '#60a5fa';
	context.textAlign = 'left';
	context.fillText(team1Players, 20, 30);

	context.fillStyle = '#f87171';
	context.textAlign = 'right';
	context.fillText(team2Players, canvasSize - 20, 30);

	players.forEach((player: Player) =>
	{
		if (player.id === myUserId)
			context.fillStyle = myPaddlePattern;
		else
			context.fillStyle = player.team === 1 ? '#60a5fa' : '#f87171';

		if (player.position === 'left' || player.position === 'right')
			context.fillRect(player.x, player.y, paddleThickness, paddleSize);
		else
			context.fillRect(player.x, player.y, paddleSize, paddleThickness);
	});

	if (ballX !== undefined && ballY !== undefined)
	{
	  context.fillStyle = 'white';
	  context.beginPath();
	  context.arc(ballX, ballY, 10, 0, Math.PI * 2);
	  context.fill();
	}
}

function gameLoop()
{
	renderGame();
	animationFrameId = requestAnimationFrame(gameLoop);
}

function handleKeyDown(event: KeyboardEvent) {
	keysPressed[event.key] = true;
}

function handleKeyUp(event: KeyboardEvent) {
	keysPressed[event.key] = false;
}

function initializeGame(payload: GameStartPayload)
{
	const gameOverModal = document.getElementById('game-over-modal')!;
	gameOverModal.classList.add('hidden');
	gameOverModal.classList.remove('flex');

	const statusDiv = document.getElementById('game-status')!;
	const token = localStorage.getItem('token');
	myUserId = token ? jwt_decode(token).userId : null;
	
	gameConfig = { ...payload };
	canvas.width = gameConfig.canvasSize;
	canvas.height = gameConfig.canvasSize;
	
	statusDiv.classList.add('hidden'); 
	canvas.classList.remove('hidden');
	
	myPlayer = payload.players.find((p: Player) => p.id === myUserId) || null;

	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('keyup', handleKeyUp);

	if (movementInterval) clearInterval(movementInterval);
	movementInterval = setInterval(() =>
	{
		if (!socket)
			return ;
		let direction: 'up' | 'down' | null = null;
		if (keysPressed['w'] || keysPressed['ArrowUp'] || keysPressed['mobile_up'])
			direction = 'up';
		else if (keysPressed['s'] || keysPressed['ArrowDown'] || keysPressed['mobile_down'])
			direction = 'down';

		if (direction)
			socket.emit('playerMove', { direction });
	}, 1000 / 60);

	if (animationFrameId)
		cancelAnimationFrame(animationFrameId);
	gameLoop();
}

export function render(): string
{
	return `
	<div class="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center relative px-4 py-4">
	  <div id="game-status" class="text-xl sm:text-2xl md:text-3xl text-white mb-4 text-center"></div>
	  <canvas id="pong-canvas" width="800" height="800" class="bg-black border border-white hidden max-w-full max-h-[70vh] w-auto h-auto"></canvas>
	  <a id="main-leave-link" href="/lobby" class="mt-4 text-blue-400 hover:text-blue-300 text-sm sm:text-base">${t('leave_lobby')}</a>
	  <div id="mobile-controls" class="hidden mt-4 space-x-8 sm:space-x-12 md:space-x-20">
		<button id="move-up-btn" class="select-none size-40 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-blue-500 active:bg-red-700 text-white rounded-full text-xl sm:text-xl md:text-2xl touch-manipulation">↑</button>
		<button id="move-down-btn" class="select-none size-40 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-blue-500 active:bg-red-700 text-white rounded-full text-xl sm:text-xl md:text-2xl touch-manipulation">↓</button>
	  </div>
	  <div id="game-over-modal" class="hidden absolute inset-0 bg-black bg-opacity-75 items-center justify-center text-white p-4">
		<div class="bg-gray-800 bg-opacity-90 p-6 sm:p-8 md:p-10 rounded-lg shadow-2xl text-center max-w-xs sm:max-w-sm md:max-w-lg w-full">
			<h2 id="game-over-text" class="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 sm:mb-8"></h2>
			
			<div id="regular-game-over-buttons" class="hidden flex-col items-center space-y-4">
				<p class="text-lg sm:text-xl mb-4">${t('rematch_question')}</p>
				<div class="flex flex-col justify-between sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full">
					<button id="stay-button" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 sm:px-6 rounded w-full sm:w-auto">${t('stay_on_page')}</button>
					<a href="/lobby" data-link class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 sm:px-6 rounded w-full sm:w-auto text-center">${t('return_to_lobby')}</a>
				</div>
			</div>

			<div id="tournament-game-over-buttons" class="hidden flex-col items-center space-y-4">
				 <a id="return-to-tournament-btn" href="#" data-link class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 sm:px-6 rounded text-center w-full">
					${t('return_to_tournament')}
				 </a>
				 <a id="return-to-lobby-btn" href="/lobby" data-link class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 sm:px-6 rounded text-center hidden w-full">
					${t('return_to_lobby')}
				 </a>
			</div>
		</div>
	  </div>
	  
	  <div id="leave-tournament-match-confirm-modal" class="hidden absolute inset-0 bg-black bg-opacity-75 z-50 items-center justify-center p-4">
			<div class="bg-gray-800 p-6 sm:p-8 rounded-lg shadow-xl text-center max-w-xs sm:max-w-sm w-full">
				<p class="text-base sm:text-lg mb-6">${t('leave_tournament_confirm')}</p>
				<div class="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
					<button id="cancel-leave-match-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 sm:px-6 rounded w-full sm:w-auto">
						${t('cancel_button')}
					</button>
					<button id="confirm-leave-match-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 sm:px-6 rounded w-full sm:w-auto">
						${t('leave_button')}
					</button>
				</div>
			</div>
		</div>
	</div>
  `;
}

export function afterRender()
{
	socket = getSocket()!;
	canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
	context = canvas.getContext('2d')!;
	const statusDiv = document.getElementById('game-status')!;
	const token = localStorage.getItem('token');
	myUserId = token ? jwt_decode(token).userId : null;
	
	const gameOverModal = document.getElementById('game-over-modal')!;
	const gameOverText = document.getElementById('game-over-text')!;
	const regularGameOverButtons = document.getElementById('regular-game-over-buttons')!;
	const tournamentGameOverButtons = document.getElementById('tournament-game-over-buttons')!;
	const stayButton = document.getElementById('stay-button')!;
	const returnToTournamentBtn = document.getElementById('return-to-tournament-btn') as HTMLAnchorElement;
	const returnToLobbyBtn = document.getElementById('return-to-lobby-btn') as HTMLAnchorElement;

	const mobileControls = document.getElementById('mobile-controls')!;
	const moveUpBtn = document.getElementById('move-up-btn')!;
	const moveDownBtn = document.getElementById('move-down-btn')!;

	function isMobile() {
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
	}

	if (isMobile())
		mobileControls.classList.remove('hidden');

	const handleTouchStart = (direction: 'up' | 'down') => {
		keysPressed[`mobile_${direction}`] = true;
	};

	const handleTouchEnd = (direction: 'up' | 'down') => {
		keysPressed[`mobile_${direction}`] = false;
	};

	moveUpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouchStart('up'); });
	moveUpBtn.addEventListener('touchend', (e) => { e.preventDefault(); handleTouchEnd('up'); });
	moveDownBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouchStart('down'); });
	moveDownBtn.addEventListener('touchend', (e) => { e.preventDefault(); handleTouchEnd('down'); });

	const mainLeaveLink = document.getElementById('main-leave-link')!;
	const leaveMatchModal = document.getElementById('leave-tournament-match-confirm-modal')!;
	const cancelLeaveMatchBtn = document.getElementById('cancel-leave-match-btn')!;
	const confirmLeaveMatchBtn = document.getElementById('confirm-leave-match-btn')!;

	gameOverModal.classList.add('hidden');
	gameOverModal.classList.remove('flex');
	canvas.classList.add('hidden');
	statusDiv.classList.remove('hidden');
	statusDiv.textContent = t('waiting_for_opponent');

	stayButton.addEventListener('click', () =>
	{
		gameOverModal.classList.add('hidden');
		gameOverModal.classList.remove('flex', 'items-center', 'justify-center');
	});

	mainLeaveLink.addEventListener('click', (e) =>
	{
		e.preventDefault(); 
		if (sessionStorage.getItem('activeTournamentId'))
		{
			leaveMatchModal.classList.remove('hidden');
			leaveMatchModal.classList.add('flex', 'items-center', 'justify-center');
		}
		else
			navigateTo('/lobby');
	});

	cancelLeaveMatchBtn.addEventListener('click', () =>
	{
		leaveMatchModal.classList.add('hidden');
		leaveMatchModal.classList.remove('flex', 'items-center', 'justify-center');
	});

	confirmLeaveMatchBtn.addEventListener('click', () =>
	{
		const tournamentId = sessionStorage.getItem('activeTournamentId');
		if (tournamentId)
			socket?.emit('leave_tournament', { tournamentId });
		leaveMatchModal.classList.add('hidden');
		leaveMatchModal.classList.remove('flex', 'items-center', 'justify-center');
		navigateTo('/lobby');
	});

	socket.emit('client_ready_for_game');

	socket.on('gameStart', (payload: GameStartPayload) =>
	{ 
		statusDiv.classList.add('hidden');
		canvas.classList.remove('hidden');
		initializeGame(payload);
	});

	socket.on('updateQueue', ({ queueSize, requiredSize }: UpdateQueuePayload) =>
	{
		statusDiv.textContent = `${t('waiting_for_opponent')} (${queueSize}/${requiredSize})`;
	});

	socket.on('gameStateUpdate', (newGameState: GameState) =>
	{
		gameState = newGameState;
	});

	socket.on('gameOver', ({ winners }: GameOverPayload) =>
	{
		window.removeEventListener('keydown', handleKeyDown);
		window.removeEventListener('keyup', handleKeyUp);
		if (movementInterval) {
			clearInterval(movementInterval);
			movementInterval = null;
		}
		if (animationFrameId)
			cancelAnimationFrame(animationFrameId);
		
		const isWinner = winners.some((winner: Player) => winner.id === myUserId);
		const activeTournamentId = sessionStorage.getItem('activeTournamentId');

		gameOverText.textContent = isWinner ? t('you_win') : t('you_lose');
		
		gameOverModal.classList.remove('hidden');
		gameOverModal.classList.add('flex', 'items-center', 'justify-center');
		
		if (activeTournamentId)
		{
			tournamentGameOverButtons.classList.remove('hidden');
			regularGameOverButtons.classList.add('hidden');
			returnToTournamentBtn.href = `/tournament/${activeTournamentId}/play`;
			if (isWinner)
				returnToLobbyBtn.classList.add('hidden');
			else
				returnToLobbyBtn.classList.remove('hidden');
			sessionStorage.removeItem('activeTournamentId');
		}
		else
		{
			regularGameOverButtons.classList.remove('hidden');
			tournamentGameOverButtons.classList.add('hidden');
		}
	});
}

export function cleanup()
{
	if (socket)
	{
		socket.emit('leaveGameOrLobby');
		socket.off('updateQueue');
		socket.off('gameStart');
		socket.off('gameStateUpdate');
		socket.off('gameOver');
	}
	window.removeEventListener('keydown', handleKeyDown);
	window.removeEventListener('keyup', handleKeyUp);
	if (movementInterval) {
		clearInterval(movementInterval);
		movementInterval = null;
	}
	if (animationFrameId)
		cancelAnimationFrame(animationFrameId);
	animationFrameId = 0;
	myPlayer = null;
	gameConfig = null;
	gameState = {};
	sessionStorage.removeItem('activeTournamentId');
}