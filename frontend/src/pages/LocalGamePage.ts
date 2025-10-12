import { t } from '../i18n';
import { getGameSettings, createPowerup, applyPowerupEffect, removePowerupEffect } from '../utils/gameSettings';
import type { GameSettings, PowerupEffect } from '../utils/gameSettings';

let gameSettings: GameSettings;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 10;

let gameState =
{
	leftPaddleY: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
	rightPaddleY: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
	ballX: CANVAS_WIDTH / 2,
	ballY: CANVAS_HEIGHT / 2,
	ballSpeedX: 7,
	ballSpeedY: 6,
	leftScore: 0,
	rightScore: 0,
	ballSpeedMultiplier: 1,
	powerups: [] as PowerupEffect[],
	activePowerups: [] as PowerupEffect[],
	lastPowerupSpawn: 0,
};

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let animationFrameId: number;
const keysPressed: { [key: string]: boolean } = {};

let p1UpStart: (e: Event) => void, p1UpEnd: (e: Event) => void;
let p1DownStart: (e: Event) => void, p1DownEnd: (e: Event) => void;
let p2UpStart: (e: Event) => void, p2UpEnd: (e: Event) => void;
let p2DownStart: (e: Event) => void, p2DownEnd: (e: Event) => void;
let fullscreenChangeHandler: () => void;

function initializeGameSettings()
{
	gameSettings = getGameSettings();
	if (canvas)
	{
		canvas.width = CANVAS_WIDTH;
		canvas.height = CANVAS_HEIGHT;
	}
	gameState =
	{
		leftPaddleY: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
		rightPaddleY: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
		ballX: CANVAS_WIDTH / 2,
		ballY: CANVAS_HEIGHT / 2,
		ballSpeedX: gameSettings.ballSpeed,
		ballSpeedY: gameSettings.ballSpeed * (Math.random() < 0.5 ? -0.6 : 0.6),
		leftScore: 0,
		rightScore: 0,
		ballSpeedMultiplier: 1,
		powerups: [] as PowerupEffect[],
		activePowerups: [] as PowerupEffect[],
		lastPowerupSpawn: 0,
	};
}

function updatePowerups()
{
	const currentTime = Date.now();
	if (gameSettings.mode === 'powerup' && gameSettings.powerups.speedBoost && currentTime - gameState.lastPowerupSpawn > 8000)
	{
		const powerup = createPowerup(
			Math.random() * (CANVAS_WIDTH - 60) + 30,
			Math.random() * (CANVAS_HEIGHT - 60) + 30
		);
		gameState.powerups.push(powerup);
		gameState.lastPowerupSpawn = currentTime;
	}
	gameState.activePowerups = gameState.activePowerups.filter(powerup =>
	{
		if (currentTime > powerup.duration)
		{
			removePowerupEffect(powerup, gameState);
			return (false);
		}
		return (true);
	});
	gameState.powerups = gameState.powerups.filter(powerup =>
	{
		const dx = gameState.ballX - powerup.x;
		const dy = gameState.ballY - powerup.y;
		const distance = Math.sqrt(dx * dx + dy * dy);
		if (distance < BALL_SIZE + 15)
		{
			powerup.duration = Date.now() + powerup.duration;
			gameState.activePowerups.push(powerup);
			applyPowerupEffect(powerup, gameState);
			return (false);
		}
		return (true);
	});
}

function drawPowerups()
{
	gameState.powerups.forEach(powerup =>
	{
		context.fillStyle = '#ff6b6b';
		context.beginPath();
		context.arc(powerup.x, powerup.y, 15, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = 'white';
		context.font = '12px Arial';
		context.textAlign = 'center';
		context.fillText('⚡', powerup.x, powerup.y + 4);
	});
}

export function render()
{
	return `
		<div id="local-game-container" class="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center relative p-4">
			<div id="fullscreen-overlay">
				<h2 class="text-3xl font-bold mb-4">${t('game_mode_selection') || 'Game Mode Selection'}</h2>
				<div class="flex flex-col space-y-4">
					<button id="fullscreen-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg text-xl transition">${t('enter_fullscreen_button') || 'Play Fullscreen'}</button>
					<button id="windowed-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg text-xl transition">${t('play_windowed_button') || 'Play in Window'}</button>
					<a href="/lobby" data-link class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg text-lg transition text-center">${t('back_to_lobby') || 'Back to Lobby'}</a>
				</div>
			</div>
			<div id="game-content" class="hidden h-full w-full flex-col items-center justify-center">
				<div id="local-game-layout" class="flex items-center justify-center w-full">
					<div id="p1-controls" class="hidden flex-col items-center justify-center p-4 space-y-6">
						<button id="p1-up" class="select-none size-20 bg-blue-500/70 active:bg-red-600 text-white rounded-full text-2xl touch-manipulation">↑</button>
						<button id="p1-down" class="select-none size-20 bg-blue-500/70 active:bg-red-600 text-white rounded-full text-2xl touch-manipulation">↓</button>
					</div>
					<canvas id="pong-canvas" width="800" height="600" class="bg-black border-2 border-slate-700 max-w-full max-h-[80vh]"></canvas>
					<div id="p2-controls" class="hidden flex-col items-center justify-center p-4 space-y-6">
						<button id="p2-up" class="select-none size-20 bg-red-500/70 active:bg-blue-600 text-white rounded-full text-2xl touch-manipulation">↑</button>
						<button id="p2-down" class="select-none size-20 bg-red-500/70 active:bg-blue-600 text-white rounded-full text-2xl touch-manipulation">↓</button>
					</div>
				</div>
				<div class="absolute bottom-20 left-4 flex space-x-2">
					<button id="exit-fullscreen-btn" class="hidden bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition">${t('exit_fullscreen') || 'Exit Fullscreen'}</button>
					<a href="/lobby" data-link class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition">${t('exit_game') || 'Exit Game'}</a>
				</div>
				<a href="/lobby" data-link class="absolute bottom-4 right-4 text-blue-400 hover:text-blue-300">${t('return_to_lobby_button')}</a>
			</div>
		</div>
	`;
}

function drawRect(x: number, y: number, w: number, h: number, color: string)
{
	context.fillStyle = color;
	context.fillRect(x, y, w, h);
}
function drawCircle(x: number, y: number, r: number, color: string)
{
	context.fillStyle = color;
	context.beginPath();
	context.arc(x, y, r, 0, Math.PI * 2, false);
	context.fill();
}
function drawText(text: string, x: number, y: number, color: string)
{
	context.fillStyle = color;
	context.font = "75px Arial";
	context.fillText(text, x, y);
}
function renderGame()
{
	if (!context)
		return ;
	drawRect(0, 0, canvas.width, canvas.height, "black");
	drawText(gameState.leftScore.toString(), canvas.width / 4, canvas.height / 5, "white");
	drawText(gameState.rightScore.toString(), 3 * canvas.width / 4, canvas.height / 5, "white");
	drawRect(0, gameState.leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT, "white");
	drawRect(canvas.width - PADDLE_WIDTH, gameState.rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT, "white");
	drawCircle(gameState.ballX, gameState.ballY, BALL_SIZE, "white");
	if (gameSettings && gameSettings.mode === 'powerup')
		drawPowerups();
}

function resetBall()
{
	gameState.ballX = canvas.width / 2;
	gameState.ballY = canvas.height / 2;
	const baseSpeedX = gameSettings.ballSpeed;
	gameState.ballSpeedX = (Math.random() < 0.5 ? -baseSpeedX : baseSpeedX);
	let randomY;
	do
	{
		randomY = Math.random() * (baseSpeedX * 1.5) - (baseSpeedX * 0.75);
	}
	while (Math.abs(randomY) < baseSpeedX * 0.3);
	gameState.ballSpeedY = randomY;
}
function update()
{
	if (!canvas || !gameSettings)
		return ;
	if (gameSettings.mode === 'powerup')
		updatePowerups();
	const paddleSpeed = gameSettings.paddleSpeed;
	if (keysPressed['w'] && gameState.leftPaddleY > 0)
		gameState.leftPaddleY -= paddleSpeed;
	if (keysPressed['s'] && gameState.leftPaddleY < canvas.height - PADDLE_HEIGHT)
		gameState.leftPaddleY += paddleSpeed;
	if (keysPressed['ArrowUp'] && gameState.rightPaddleY > 0)
		gameState.rightPaddleY -= paddleSpeed;
	if (keysPressed['ArrowDown'] && gameState.rightPaddleY < canvas.height - PADDLE_HEIGHT)
		gameState.rightPaddleY += paddleSpeed;
	const ballSpeedX = gameState.ballSpeedX * gameState.ballSpeedMultiplier;
	const ballSpeedY = gameState.ballSpeedY * gameState.ballSpeedMultiplier;
	gameState.ballX += ballSpeedX;
	gameState.ballY += ballSpeedY;
	if (gameState.ballY - BALL_SIZE < 0 || gameState.ballY + BALL_SIZE > canvas.height)
		gameState.ballSpeedY = -gameState.ballSpeedY;
	if (
		gameState.ballX - BALL_SIZE < PADDLE_WIDTH &&
		gameState.ballY + BALL_SIZE > gameState.leftPaddleY &&
		gameState.ballY - BALL_SIZE < gameState.leftPaddleY + PADDLE_HEIGHT
	)
	{
		const collidePoint = (gameState.ballY - (gameState.leftPaddleY + PADDLE_HEIGHT / 2));
		const normalizedCollidePoint = collidePoint / (PADDLE_HEIGHT / 2);
		const bounceAngle = normalizedCollidePoint * (Math.PI / 4);
		gameState.ballSpeedX = Math.abs(gameSettings.ballSpeed) * 1.05;
		gameState.ballSpeedY = (Math.abs(gameSettings.ballSpeed) * 1.5) * Math.sin(bounceAngle);
		gameState.ballX = PADDLE_WIDTH + BALL_SIZE;
	}
	else if (
		gameState.ballX + BALL_SIZE > canvas.width - PADDLE_WIDTH &&
		gameState.ballY + BALL_SIZE > gameState.rightPaddleY &&
		gameState.ballY - BALL_SIZE < gameState.rightPaddleY + PADDLE_HEIGHT
	)
	{
		const collidePoint = (gameState.ballY - (gameState.rightPaddleY + PADDLE_HEIGHT / 2));
		const normalizedCollidePoint = collidePoint / (PADDLE_HEIGHT / 2);
		const bounceAngle = normalizedCollidePoint * (Math.PI / 4);
		gameState.ballSpeedX = -Math.abs(gameSettings.ballSpeed) * 1.05;
		gameState.ballSpeedY = (Math.abs(gameSettings.ballSpeed) * 1.5) * Math.sin(bounceAngle);
		gameState.ballX = canvas.width - PADDLE_WIDTH - BALL_SIZE;
	}
	if (gameState.ballX - BALL_SIZE < 0)
	{
		gameState.rightScore++;
		resetBall();
	}
	else if (gameState.ballX + BALL_SIZE > canvas.width)
	{
		gameState.leftScore++;
		resetBall();
	}
}

function gameLoop()
{
	update();
	renderGame();
	animationFrameId = requestAnimationFrame(gameLoop);
}
function startGame()
{
	gameState.lastPowerupSpawn = Date.now() - 5000;
	if (animationFrameId)
		cancelAnimationFrame(animationFrameId);
	gameLoop();
}
function stopGame()
{
	if (animationFrameId)
		cancelAnimationFrame(animationFrameId);
	animationFrameId = 0;
}

export function afterRender()
{
	const gameContainer = document.getElementById('local-game-container') as HTMLDivElement;
	const fullscreenOverlay = document.getElementById('fullscreen-overlay') as HTMLDivElement;
	const gameContent = document.getElementById('game-content') as HTMLDivElement;
	const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
	const windowedBtn = document.getElementById('windowed-btn') as HTMLButtonElement;
	const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn') as HTMLButtonElement;
	const localCanvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
	if (localCanvas)
	{
		canvas = localCanvas;
		context = canvas.getContext('2d')!;
		initializeGameSettings();
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		const p1Controls = document.getElementById('p1-controls');
		const p2Controls = document.getElementById('p2-controls');
		const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		if (isMobile)
		{
			p1Controls?.classList.remove('hidden');
			p1Controls?.classList.add('flex');
			p2Controls?.classList.remove('hidden');
			p2Controls?.classList.add('flex');
		}
		const p1Up = document.getElementById('p1-up');
		const p1Down = document.getElementById('p1-down');
		const p2Up = document.getElementById('p2-up');
		const p2Down = document.getElementById('p2-down');
		p1UpStart = (e) => { e.preventDefault(); keysPressed['w'] = true; };
		p1UpEnd = (e) => { e.preventDefault(); keysPressed['w'] = false; };
		p1DownStart = (e) => { e.preventDefault(); keysPressed['s'] = true; };
		p1DownEnd = (e) => { e.preventDefault(); keysPressed['s'] = false; };
		p2UpStart = (e) => { e.preventDefault(); keysPressed['ArrowUp'] = true; };
		p2UpEnd = (e) => { e.preventDefault(); keysPressed['ArrowUp'] = false; };
		p2DownStart = (e) => { e.preventDefault(); keysPressed['ArrowDown'] = true; };
		p2DownEnd = (e) => { e.preventDefault(); keysPressed['ArrowDown'] = false; };
		p1Up?.addEventListener('touchstart', p1UpStart);
		p1Up?.addEventListener('touchend', p1UpEnd);
		p1Down?.addEventListener('touchstart', p1DownStart);
		p1Down?.addEventListener('touchend', p1DownEnd);
		p2Up?.addEventListener('touchstart', p2UpStart);
		p2Up?.addEventListener('touchend', p2UpEnd);
		p2Down?.addEventListener('touchstart', p2DownStart);
		p2Down?.addEventListener('touchend', p2DownEnd);
		fullscreenBtn.addEventListener('click', () =>
		{
			if (gameContainer.requestFullscreen)
				gameContainer.requestFullscreen();
		});
		windowedBtn.addEventListener('click', () =>
		{
			fullscreenOverlay.style.display = 'none';
			gameContent.classList.remove('hidden');
			startGame();
		});
		exitFullscreenBtn.addEventListener('click', () =>
		{
			if (document.fullscreenElement)
				document.exitFullscreen();
		});
		fullscreenChangeHandler = () =>
		{
			if (document.fullscreenElement === gameContainer)
			{
				fullscreenOverlay.style.display = 'none';
				gameContent.classList.remove('hidden');
				exitFullscreenBtn.classList.remove('hidden');
				startGame();
			}
			else if (document.fullscreenElement === null && !gameContent.classList.contains('hidden'))
				exitFullscreenBtn.classList.add('hidden');
		};
		document.addEventListener('fullscreenchange', fullscreenChangeHandler);
	}
}
export function cleanup()
{
	stopGame();
	window.removeEventListener('keydown', handleKeyDown);
	window.removeEventListener('keyup', handleKeyUp);
	document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
	const p1Up = document.getElementById('p1-up');
	const p1Down = document.getElementById('p1-down');
	const p2Up = document.getElementById('p2-up');
	const p2Down = document.getElementById('p2-down');
	p1Up?.removeEventListener('touchstart', p1UpStart);
	p1Up?.removeEventListener('touchend', p1UpEnd);
	p1Down?.removeEventListener('touchstart', p1DownStart);
	p1Down?.removeEventListener('touchend', p1DownEnd);
	p2Up?.removeEventListener('touchstart', p2UpStart);
	p2Up?.removeEventListener('touchend', p2UpEnd);
	p2Down?.removeEventListener('touchstart', p2DownStart);
	p2Down?.removeEventListener('touchend', p2DownEnd);
	
	gameState =
	{
		leftPaddleY: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
		rightPaddleY: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
		ballX: CANVAS_WIDTH / 2,
		ballY: CANVAS_HEIGHT / 2,
		ballSpeedX: 7,
		ballSpeedY: 6,
		leftScore: 0,
		rightScore: 0,
		ballSpeedMultiplier: 1,
		powerups: [] as PowerupEffect[],
		activePowerups: [] as PowerupEffect[],
		lastPowerupSpawn: 0,
	};
}
function handleKeyDown(event: KeyboardEvent)
{
	keysPressed[event.key] = true;
}
function handleKeyUp(event: KeyboardEvent)
{
	keysPressed[event.key] = false;
}