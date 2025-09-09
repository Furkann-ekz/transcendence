// backend/websockets/index.js (NİHAİ GÜNCEL HALİ)
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');
const chatHandler = require('./chatHandler');
const JWT_SECRET = process.env.JWT_SECRET;

// Paylaşılan değişkenler (shared state) bu dosyanın en üstünde yönetiliyor.
const onlineUsers = new Map();
let waitingPlayer = null;
const gameRooms = new Map();

// --- Oyun Yardımcı Fonksiyonları ---
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

// --- Ana Socket Fonksiyonu ---
function initializeSocket(io) {
    // Kimlik Doğrulama Middleware'i
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, name: true }
            });
            if (!user) return next(new Error('User not found'));
            socket.user = user;
            next();
        } catch (err) {
            return next(new Error('Invalid token'));
        }
    });

    // Ana Bağlantı Olayı
    io.on('connection', (socket) => {
        console.log(`${socket.user.email} bağlandı.`);
        onlineUsers.set(socket.user.id, { id: socket.user.id, socketId: socket.id, email: socket.user.email, name: socket.user.name });
        io.emit('update user list', Array.from(onlineUsers.values()));

        // Sohbet olay dinleyicilerini kur
        chatHandler(io, socket, onlineUsers);

        // İstemci güncel kullanıcı listesini istediğinde gönder
        socket.on('requestUserList', () => {
            socket.emit('update user list', Array.from(onlineUsers.values()));
        });

        // Kullanıcı eşleştirme havuzuna katılmak istediğinde
        socket.on('joinMatchmaking', () => {
            console.log(`${socket.user.email} eşleştirme havuzuna katıldı.`);
            if (waitingPlayer && waitingPlayer.id !== socket.id) {
                const player1 = waitingPlayer;
                waitingPlayer = null;
                const player2 = socket;
                const roomName = `game_${player1.id}_${player2.id}`;
                const players = [ { ...player1.user, socketId: player1.id, paddleY: 250, isLeft: true }, { ...player2.user, socketId: player2.id, paddleY: 250, isLeft: false } ];
                player1.join(roomName);
                player2.join(roomName);
                player1.gameRoomId = roomName;
                player2.gameRoomId = roomName;
                const game = startGameLoop(roomName, players, io);
                gameRooms.set(roomName, game);
            } else {
                waitingPlayer = socket;
                socket.emit('waitingForPlayer');
            }
        });

        // Oyuncu raketini hareket ettirdiğinde
        socket.on('playerMove', (data) => {
            const game = gameRooms.get(socket.gameRoomId);
            if (!game) return;
            const playerState = game.gameState.players.find(p => p.id === socket.user.id);
            if (!playerState) return;
            const canvasHeight = 600, paddleHeight = 100;
            let newY = data.paddleY;
            if (newY < 0) newY = 0;
            if (newY > canvasHeight - paddleHeight) newY = canvasHeight - paddleHeight;
            playerState.paddleY = newY;
        });

        // Kullanıcı bağlantıyı kestiğinde
        socket.on('disconnect', () => {
            console.log(`${socket.user.email} ayrıldı.`);
            onlineUsers.delete(socket.user.id);
            io.emit('update user list', Array.from(onlineUsers.values()));
            
            if (socket.gameRoomId) {
                const game = gameRooms.get(socket.gameRoomId);
                if (game) {
                    clearInterval(game.intervalId);
                    const otherPlayer = game.players.find(p => p.socketId !== socket.id);
                    if (otherPlayer) io.to(otherPlayer.socketId).emit('opponentLeft');
                    gameRooms.delete(socket.gameRoomId);
                }
            }
            if (waitingPlayer && waitingPlayer.id === socket.id) {
                waitingPlayer = null;
            }
        });
    });
}

module.exports = initializeSocket;