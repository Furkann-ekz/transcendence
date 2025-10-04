// backend/websockets/index.js
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');
const chatHandler = require('./chatHandler');
const { handleJoinMatchmaking, updatePlayerStats, saveMatch } = require('./gameHandler');
// DEĞİŞİKLİK: Yeni turnuva mantığını import ediyoruz
const tournamentHandler = require('./tournamentHandler');
const JWT_SECRET = process.env.JWT_SECRET;

function initializeSocket(io) {
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

        // DEĞİŞİKLİK: Yeni "Hazırım" olayını dinlemek için handler'ı çağırıyoruz
        tournamentHandler.handlePlayerReady(socket, io, onlineUsers, gameState.gameRooms);

        socket.on('joinMatchmaking', (payload) => {
            console.log(`${socket.user.email} eşleştirme havuzuna katıldı. Mod: ${payload.mode}`);
            handleJoinMatchmaking(io, socket, gameState, payload);
        });

        socket.on('join_tournament_lobby', ({ tournamentId }) => {
            if (tournamentId) {
                socket.join(tournamentId);
                console.log(`${socket.user.email}, ${tournamentId} odasına katıldı.`);
            }
        });

        socket.on('leave_tournament_lobby', ({ tournamentId }) => {
            if (tournamentId) {
                socket.leave(tournamentId);
                console.log(`${socket.user.email}, ${tournamentId} odasından ayrıldı.`);
            }
        });

        socket.on('leave_tournament', async ({ tournamentId }) => {
            const userId = socket.user.id;
            console.log(`[Tournament ${tournamentId}] Oyuncu ${socket.user.name} turnuvadan ayrılıyor.`);
            try {
                await prisma.tournamentPlayer.updateMany({
                    where: { tournamentId: tournamentId, userId: userId },
                    data: { isEliminated: true }
                });
                const updatedPlayers = await prisma.tournamentPlayer.findMany({
                    where: { tournamentId: tournamentId },
                    include: { user: { select: { id: true, name: true, avatarUrl: true } } }
                });
                io.to(tournamentId).emit('tournament_update', { players: updatedPlayers });
            } catch (error) {
                console.error(`[Tournament ${tournamentId}] Oyuncu ayrılırken hata oluştu:`, error);
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

        socket.on('client_ready_for_game', () => {
            if (socket.gameRoom) {
                const game = gameState.gameRooms.get(socket.gameRoom.id);
                if (game) {
                    const gameStartPayload = {
                        players: game.players.map(p => ({id: p.id, name: p.name, email: p.email, position: p.position, team: p.team})),
                        mode: game.mode,
                        canvasSize: game.canvasSize,
                        paddleSize: game.paddleSize,
                        paddleThickness: game.paddleThickness,
                        tournamentId: game.tournamentId || null
                    };
                    socket.emit('gameStart', gameStartPayload);
                }
            }
        });

        socket.on('playerMove', (data) => {
            if (!socket.gameRoom) return;
            const game = gameState.gameRooms.get(socket.gameRoom.id);
            if (!game) return;
            const playerState = game.gameState.players.find(p => p.id === socket.user.id);
            if (!playerState) return;

            const canvasSize = game.canvasSize || 800;
            const paddleSize = game.paddleSize || 100;

            const { newPosition } = data;
            let finalPosition = newPosition;
            if (finalPosition < 0) finalPosition = 0;
            if (finalPosition > canvasSize - paddleSize) finalPosition = canvasSize - paddleSize;

            if (playerState.position === 'left' || playerState.position === 'right') playerState.y = finalPosition;
            if (playerState.position === 'top' || playerState.position === 'bottom') playerState.x = finalPosition;
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

    return { onlineUsers, gameRooms: gameState.gameRooms };
}

module.exports = initializeSocket;