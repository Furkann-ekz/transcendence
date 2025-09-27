// backend/websockets/index.js
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');
const chatHandler = require('./chatHandler');
const { handleJoinMatchmaking, startGameLoop, updatePlayerStats, saveMatch } = require('./gameHandler');
const JWT_SECRET = process.env.JWT_SECRET;

function initializeSocket(io) {
    // Tüm state yönetimi bu fonksiyonun içinde kalmalı.
    const onlineUsers = new Map();
    const gameState = {
        waitingPlayers: {
            '1v1': [],
            '2v2': []
        },
        gameRooms: new Map()
    };

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
        if (onlineUsers.has(socket.user.id)) {
            const oldSocketId = onlineUsers.get(socket.user.id).socketId;
            const oldSocket = io.sockets.sockets.get(oldSocketId);
            if (oldSocket) {
                oldSocket.emit('forceDisconnect', 'Başka bir yerden giriş yapıldı.');
                oldSocket.disconnect();
                console.log(`Eski oturum sonlandırıldı: ${socket.user.email} (Socket ID: ${oldSocketId})`);
            }
        }

        console.log(`${socket.user.email} bağlandı. (Socket ID: ${socket.id})`);
        onlineUsers.set(socket.user.id, { id: socket.user.id, socketId: socket.id, email: socket.user.email, name: socket.user.name });
        io.emit('update user list', Array.from(onlineUsers.values()));

        socket.on('requestUserList', () => {
            socket.emit('update user list', Array.from(onlineUsers.values()));
        });

        chatHandler(io, socket, onlineUsers);

        socket.on('joinMatchmaking', (payload) => {
            console.log(`${socket.user.email} eşleştirme havuzuna katıldı. Mod: ${payload.mode}`);
            handleJoinMatchmaking(io, socket, gameState, payload);
        });

        socket.on('invite_to_game', ({ targetUserId }) => {
            const targetUserSocketInfo = onlineUsers.get(targetUserId);
            if (targetUserSocketInfo) {
                io.to(targetUserSocketInfo.socketId).emit('receive_game_invite', {
                    fromUser: { id: socket.user.id, name: socket.user.name || socket.user.email }
                });
            }
        });

        socket.on('decline_game_invite', ({ senderId }) => {
            const senderSocketInfo = onlineUsers.get(senderId);
            if (senderSocketInfo) {
                io.to(senderSocketInfo.socketId).emit('invite_declined', {
                    fromUser: { id: socket.user.id, name: socket.user.name || socket.user.email }
                });
            }
        });

        socket.on('accept_game_invite', ({ senderId }) => {
            const senderSocketInfo = onlineUsers.get(senderId);
            const receiverSocket = socket;

            if (senderSocketInfo) {
                const senderSocket = io.sockets.sockets.get(senderSocketInfo.socketId);
                if (senderSocket) {
                    const roomName = `private_game_${Date.now()}`;
                    senderSocket.join(roomName);
                    receiverSocket.join(roomName);

                    const gameConfig = { canvasSize: 800, paddleSize: 100, paddleThickness: 15 };
                    const players = [
                        { ...senderSocket.user, socketId: senderSocket.id, position: 'left', team: 1, x: 0, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) },
                        { ...receiverSocket.user, socketId: receiverSocket.id, position: 'right', team: 2, x: gameConfig.canvasSize - gameConfig.paddleThickness, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) }
                    ];

                    const game = startGameLoop(roomName, players, io, '1v1_private', gameConfig);
                    gameState.gameRooms.set(roomName, game); // Oyunu odalara ekle

                    io.to(roomName).emit('start_private_game');
                }
            }
        });

        const cleanUpPlayer = async (sock) => {
            Object.keys(gameState.waitingPlayers).forEach(mode => {
                const pool = gameState.waitingPlayers[mode];
                const newPool = pool.filter(p => p.id !== sock.id);
                if (newPool.length < pool.length) {
                    console.log(`${sock.user.email}, ${mode} bekleme havuzundan kaldırıldı.`);
                    gameState.waitingPlayers[mode] = newPool;
                    newPool.forEach(p => p.emit('updateQueue', { queueSize: newPool.length, requiredSize: mode === '1v1' ? 2 : 4 }));
                }
            });

            if (sock.gameRoom) {
                const game = gameState.gameRooms.get(sock.gameRoom.id);
                if (game) {
                    clearInterval(game.intervalId);
                    const leavingPlayer = game.players.find(p => p.socketId === sock.id);
                    if (leavingPlayer) {
                        const losingTeam = leavingPlayer.team;
                        const winningTeam = losingTeam === 1 ? 2 : 1;
                        const winners = game.players.filter(p => p.team === winningTeam);
                        const losers = game.players.filter(p => p.team === losingTeam);

                        await updatePlayerStats(winners.map(p => p.id), 'win');
                        await updatePlayerStats(losers.map(p => p.id), 'loss');
                        await saveMatch(game, winningTeam, true);

                        winners.forEach(p => {
                            const otherSocket = io.sockets.sockets.get(p.socketId);
                            if(otherSocket) otherSocket.emit('gameOver', { winners, losers, reason: 'forfeit' });
                        });
                    }
                    gameState.gameRooms.delete(sock.gameRoom.id);
                    console.log(`Oda ${sock.gameRoom.id} (terk edildi) temizlendi.`);
                }
            }
        };

        socket.on('leaveGameOrLobby', () => {
            console.log(`${socket.user.email} oyun/lobi'den manuel olarak ayrıldı.`);
            cleanUpPlayer(socket);
        });

        socket.on('disconnect', () => {
            console.log(`${socket.user.email} bağlantısı kesildi.`);
            if (onlineUsers.has(socket.user.id) && onlineUsers.get(socket.user.id).socketId === socket.id) {
                onlineUsers.delete(socket.user.id);
                io.emit('update user list', Array.from(onlineUsers.values()));
            }
            cleanUpPlayer(socket);
        });
    });
    return onlineUsers;
}

module.exports = initializeSocket;