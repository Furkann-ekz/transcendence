// backend/websockets/gameHandler.js
function startGameLoop(room, players, io) {
    const canvasWidth = 800, canvasHeight = 600, paddleHeight = 100, paddleWidth = 10;
    const gameState = {
        ballX: canvasWidth / 2, ballY: canvasHeight / 2, ballSpeedX: 5, ballSpeedY: 5,
        leftScore: 0, rightScore: 0,
        players: players.map(p => ({ id: p.id, paddleY: p.paddleY, isLeft: p.isLeft }))
    };
    const intervalId = setInterval(() => {
        gameState.ballX += gameState.ballSpeedX;
        gameState.ballY += gameState.ballSpeedY;
        if (gameState.ballY <= 0 || gameState.ballY >= canvasHeight) gameState.ballSpeedY = -gameState.ballSpeedY;
        const leftPlayer = gameState.players.find(p => p.isLeft);
        const rightPlayer = gameState.players.find(p => !p.isLeft);
        if (leftPlayer && gameState.ballX <= paddleWidth && gameState.ballY > leftPlayer.paddleY && gameState.ballY < leftPlayer.paddleY + paddleHeight) gameState.ballSpeedX = -gameState.ballSpeedX;
        if (rightPlayer && gameState.ballX >= canvasWidth - paddleWidth && gameState.ballY > rightPlayer.paddleY && gameState.ballY < rightPlayer.paddleY + paddleHeight) gameState.ballSpeedX = -gameState.ballSpeedX;
        if (gameState.ballX < 0) { gameState.rightScore++; resetBall(gameState, canvasWidth, canvasHeight); }
        else if (gameState.ballX > canvasWidth) { gameState.leftScore++; resetBall(gameState, canvasWidth, canvasHeight); }
        io.to(room).emit('gameStateUpdate', gameState);
    }, 1000 / 60);
    io.to(room).emit('gameStart', { players: players.map(p => ({id: p.id, name: p.name, email: p.email, isLeft: p.isLeft})) });
    return { players, intervalId, gameState };
}

function resetBall(gameState, width, height) {
    gameState.ballX = width / 2;
    gameState.ballY = height / 2;
    gameState.ballSpeedX = -gameState.ballSpeedX;
}

function gameHandler(io, socket, state) {
    if (state.waitingPlayer && state.waitingPlayer.id !== socket.id) {
        const player1 = state.waitingPlayer;
        state.waitingPlayer = null; // Hemen temizle
        const player2 = socket;
        const roomName = `game_${player1.id}_${player2.id}`;
        const players = [ { ...player1.user, socketId: player1.id, paddleY: 250, isLeft: true }, { ...player2.user, socketId: player2.id, paddleY: 250, isLeft: false } ];
        player1.join(roomName);
        player2.join(roomName);
        player1.gameRoomId = roomName;
        player2.gameRoomId = roomName;
        const game = startGameLoop(roomName, players, io);
        state.gameRooms.set(roomName, game);
    } else {
        state.waitingPlayer = socket;
        socket.emit('waitingForPlayer');
    }
    socket.on('playerMove', (data) => {
        const game = state.gameRooms.get(socket.gameRoomId);
        if (!game) return;

        const playerState = game.gameState.players.find(p => p.id === socket.user.id);
        if (!playerState) return;
        
        // Sunucu tarafında sınır kontrolü ekliyoruz
        const canvasHeight = 600;
        const paddleHeight = 100;
        let newY = data.paddleY;

        if (newY < 0) {
            newY = 0;
        }
        if (newY > canvasHeight - paddleHeight) {
            newY = canvasHeight - paddleHeight;
        }
        
        playerState.paddleY = newY;
    });
}

module.exports = gameHandler;
