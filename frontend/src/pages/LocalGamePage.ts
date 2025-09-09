// frontend/src/pages/GamePage.ts
// Oyun ayarları
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 10;

// Oyun durumu (state)
let gameState = {
  leftPaddleY: 250,
  rightPaddleY: 250,
  ballX: 400,
  ballY: 300,
  ballSpeedX: 5,
  ballSpeedY: 5,
  leftScore: 0,
  rightScore: 0,
};

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let animationFrameId: number;
const keysPressed: { [key: string]: boolean } = {};

// Çizim fonksiyonları
function drawRect(x: number, y: number, w: number, h: number, color: string) {
  context.fillStyle = color;
  context.fillRect(x, y, w, h);
}

function drawCircle(x: number, y: number, r: number, color: string) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2, false);
  context.fill();
}

function drawText(text: string, x: number, y: number, color: string) {
  context.fillStyle = color;
  context.font = "75px fantasy";
  context.fillText(text, x, y);
}

function renderGame() {
  if (!context) return;
  drawRect(0, 0, canvas.width, canvas.height, "black");
  drawText(gameState.leftScore.toString(), canvas.width / 4, canvas.height / 5, "white");
  drawText(gameState.rightScore.toString(), 3 * canvas.width / 4, canvas.height / 5, "white");
  drawRect(0, gameState.leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT, "white");
  drawRect(canvas.width - PADDLE_WIDTH, gameState.rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT, "white");
  drawCircle(gameState.ballX, gameState.ballY, BALL_SIZE, "white");
}

function resetBall() {
  gameState.ballX = canvas.width / 2;
  gameState.ballY = canvas.height / 2;
  gameState.ballSpeedX = -gameState.ballSpeedX;
  gameState.ballSpeedY = 5;
}

function update() {
  if (!canvas) return;
  // Paddle movements
  if (keysPressed['w'] && gameState.leftPaddleY > 0) {
    gameState.leftPaddleY -= 8;
  }
  if (keysPressed['s'] && gameState.leftPaddleY < canvas.height - PADDLE_HEIGHT) {
    gameState.leftPaddleY += 8;
  }
  if (keysPressed['ArrowUp'] && gameState.rightPaddleY > 0) {
    gameState.rightPaddleY -= 8;
  }
  if (keysPressed['ArrowDown'] && gameState.rightPaddleY < canvas.height - PADDLE_HEIGHT) {
    gameState.rightPaddleY += 8;
  }

  // Ball movement
  gameState.ballX += gameState.ballSpeedX;
  gameState.ballY += gameState.ballSpeedY;

  // Ball collision with top/bottom walls
  if (gameState.ballY - BALL_SIZE < 0 || gameState.ballY + BALL_SIZE > canvas.height) {
    gameState.ballSpeedY = -gameState.ballSpeedY;
  }

  // Ball collision with paddles
  if (
    gameState.ballX - BALL_SIZE < PADDLE_WIDTH &&
    gameState.ballY > gameState.leftPaddleY &&
    gameState.ballY < gameState.leftPaddleY + PADDLE_HEIGHT
  ) {
    gameState.ballSpeedX = -gameState.ballSpeedX;
  }
  if (
    gameState.ballX + BALL_SIZE > canvas.width - PADDLE_WIDTH &&
    gameState.ballY > gameState.rightPaddleY &&
    gameState.ballY < gameState.rightPaddleY + PADDLE_HEIGHT
  ) {
    gameState.ballSpeedX = -gameState.ballSpeedX;
  }

  // Score and reset
  if (gameState.ballX - BALL_SIZE < 0) {
    gameState.rightScore++;
    resetBall();
  } else if (gameState.ballX + BALL_SIZE > canvas.width) {
    gameState.leftScore++;
    resetBall();
  }
}

function gameLoop() {
  update();
  renderGame();
  animationFrameId = requestAnimationFrame(gameLoop); // ID'yi sakla
}

export function render() {
  return `
    <div class="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center">
      <h1 class="text-3xl text-white mb-4">Pong Game</h1>
      <canvas id="pong-canvas" width="800" height="600" class="bg-black border border-white"></canvas>
      <a href="/dashboard" data-link class="mt-4 text-blue-400">Sohbete Geri Dön</a>
    </div>
  `;
}

export function afterRender() {
  const localCanvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
  if (localCanvas) {
    canvas = localCanvas;
    context = canvas.getContext('2d')!;

    // Dinleyicileri yeni fonksiyonlarla ekle
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    gameLoop();
  }
}

export function cleanup() {
  cancelAnimationFrame(animationFrameId); // Oyun döngüsünü durdur
  // Eklediğimiz klavye dinleyicilerini kaldır
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  // Oyun durumunu sıfırla
  gameState = {
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

function handleKeyDown(event: KeyboardEvent) {
  keysPressed[event.key] = true;
}
function handleKeyUp(event: KeyboardEvent) {
  keysPressed[event.key] = false;
}
