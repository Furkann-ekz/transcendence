import { t } from '../i18n';
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 10;

let gameState =
{
	leftPaddleY: 250,
	rightPaddleY: 250,
	ballX: 400,
	ballY: 300,
	ballSpeedX: 7,
	ballSpeedY: 6,
	leftScore: 0,
	rightScore: 0,
};

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let animationFrameId: number;
const keysPressed: { [key: string]: boolean } = {};

export function render()
{
	return `
		<div class="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center">
			<h1 class="text-3xl text-white mb-4">Pong Game</h1>
			<canvas id="pong-canvas" width="800" height="600" class="bg-black border border-white"></canvas>
			<a href="/dashboard" data-link class="mt-4 text-blue-400 hover:text-blue-300">
				${t('return_to_chat')}
			</a>
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
}

function resetBall()
{
	gameState.ballX = canvas.width / 2;
	gameState.ballY = canvas.height / 2;

	const baseSpeedX = 5;
	gameState.ballSpeedX = (Math.random() < 0.5 ? -baseSpeedX : baseSpeedX);
	
	let randomY;
	do
	{
			randomY = Math.random() * 12 - 6;
	}
	while (Math.abs(randomY) < 2.5);
	gameState.ballSpeedY = randomY;
}


function update()
{
	if (!canvas)
		return ;
	if (keysPressed['w'] && gameState.leftPaddleY > 0)
		gameState.leftPaddleY -= 8;
	if (keysPressed['s'] && gameState.leftPaddleY < canvas.height - PADDLE_HEIGHT)
		gameState.leftPaddleY += 8;
	if (keysPressed['ArrowUp'] && gameState.rightPaddleY > 0)
		gameState.rightPaddleY -= 8;
	if (keysPressed['ArrowDown'] && gameState.rightPaddleY < canvas.height - PADDLE_HEIGHT)
		gameState.rightPaddleY += 8;

	gameState.ballX += gameState.ballSpeedX;
	gameState.ballY += gameState.ballSpeedY;

	if (gameState.ballY - BALL_SIZE < 0 || gameState.ballY + BALL_SIZE > canvas.height)
		gameState.ballSpeedY = -gameState.ballSpeedY;

	if (
		gameState.ballX - BALL_SIZE < PADDLE_WIDTH &&
		gameState.ballY > gameState.leftPaddleY &&
		gameState.ballY < gameState.leftPaddleY + PADDLE_HEIGHT
	)
		gameState.ballSpeedX = -gameState.ballSpeedX;
	if (
		gameState.ballX + BALL_SIZE > canvas.width - PADDLE_WIDTH &&
		gameState.ballY > gameState.rightPaddleY &&
		gameState.ballY < gameState.rightPaddleY + PADDLE_HEIGHT
	)
		gameState.ballSpeedX = -gameState.ballSpeedX;

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

export function afterRender()
{
	const localCanvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
	if (localCanvas)
	{
		canvas = localCanvas;
		context = canvas.getContext('2d')!;

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		gameLoop();
	}
}

export function cleanup()
{
	cancelAnimationFrame(animationFrameId);
	window.removeEventListener('keydown', handleKeyDown);
	window.removeEventListener('keyup', handleKeyUp);
	gameState =
	{
		leftPaddleY: 250,
		rightPaddleY: 250,
		ballX: 400,
		ballY: 300,
		ballSpeedX: 5,
		ballSpeedY: 5,
		leftScore: 0,
		rightScore: 0,
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
