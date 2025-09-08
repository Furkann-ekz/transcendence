// backend/websockets/index.js
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');
const chatHandler = require('./chatHandler');
const gameHandler = require('./gameHandler');
const JWT_SECRET = process.env.JWT_SECRET;

// Paylaşılan değişkenler (shared state)
const onlineUsers = new Map();
const gameState = {
    waitingPlayer: null,
    gameRooms: new Map()
};

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

        // Handler'ları çağır
        chatHandler(io, socket, onlineUsers);
        gameHandler(io, socket, gameState);

        // Bağlantı Kesilme Olayı
        socket.on('disconnect', () => {
            console.log(`${socket.user.email} ayrıldı.`);
            onlineUsers.delete(socket.user.id);
            io.emit('update user list', Array.from(onlineUsers.values()));
            // Oyundayken ayrılırsa...
            if (socket.gameRoomId) {
                const game = gameState.gameRooms.get(socket.gameRoomId);
                if (game) {
                    clearInterval(game.intervalId);
                    const otherPlayer = game.players.find(p => p.socketId !== socket.id);
                    if (otherPlayer) io.to(otherPlayer.socketId).emit('opponentLeft');
                    gameState.gameRooms.delete(socket.gameRoomId);
                }
            }
            // Bekleme odasındayken ayrılırsa...
            if (gameState.waitingPlayer && gameState.waitingPlayer.id === socket.id) {
                gameState.waitingPlayer = null;
            }
        });
    });
}
module.exports = initializeSocket;