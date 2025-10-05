// backend/websockets/index.js
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');
const chatHandler = require('./chatHandler');
const { handleJoinMatchmaking, updatePlayerStats, saveMatch } = require('./gameHandler');
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

    io.use(async (socket, next) => {
        // ... io.use kısmı aynı ...
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

    io.on('connection', (socket) => {
        // ... bağlantı başlangıcı aynı ...
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
        tournamentHandler.handlePlayerReady(socket, io, onlineUsers, gameState.gameRooms);
        socket.on('joinMatchmaking', (payload) => {
            handleJoinMatchmaking(io, socket, gameState, payload);
        });
        socket.on('join_tournament_lobby', ({ tournamentId }) => {
            if (tournamentId) socket.join(tournamentId);
        });
        socket.on('leave_tournament_lobby', ({ tournamentId }) => {
            if (tournamentId) socket.leave(tournamentId);
        });


        // --- DEĞİŞTİRİLEN BÖLÜM: leave_tournament ---
        socket.on('leave_tournament', async ({ tournamentId }) => {
            const userId = socket.user.id;
            console.log(`[Tournament ${tournamentId}] Oyuncu ${socket.user.name} turnuvadan ayrılıyor.`);

            // Eğer oyuncu aktif bir maçın içindeyse, maçı hükmen bitir.
            if (socket.gameRoom) {
                const game = gameState.gameRooms.get(socket.gameRoom.id);
                // Sadece turnuva maçları için bu işlemi yap
                if (game && game.onMatchEnd) {
                    console.log(`[Tournament] Aktif maçtan ayrılma tespit edildi. Hükmen mağlubiyet işleniyor.`);
                    // cleanUpPlayer fonksiyonu artık bu işi yapacak, onu çağırıyoruz.
                    await cleanUpPlayer(socket, true); // İkinci parametre turnuvadan ayrıldığını belirtir
                    return; // Fonksiyonun devam etmesini engelle
                }
            }

            // Eğer oyuncu sadece izleyiciyse veya maçta değilse, normal eleme işlemi yap.
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
                console.error(`[Tournament ${tournamentId}] İzleyici ayrılırken hata oluştu:`, error);
            }
        });

        // --- DEĞİŞTİRİLEN BÖLÜM: cleanUpPlayer ---
        const cleanUpPlayer = async (sock, isLeavingTournament = false) => {
            // Eşleştirme havuzundan temizleme kısmı aynı
            Object.keys(gameState.waitingPlayers).forEach(mode => {
                const pool = gameState.waitingPlayers[mode];
                const newPool = pool.filter(p => p.id !== sock.id);
                if (newPool.length < pool.length) {
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
                        const losers = [leavingPlayer];
                        const winners = game.players.filter(p => p.id !== leavingPlayer.id);

                        // Kazanan(lar)a oyunun bittiğini bildir
                        winners.forEach(p => {
                            const winnerSocket = io.sockets.sockets.get(p.socketId);
                            if (winnerSocket) {
                                winnerSocket.emit('gameOver', { winners, losers, reason: 'forfeit' });
                            }
                        });

                        // Eğer bu bir turnuva maçıysa, onMatchEnd'i çağırarak turnuvayı devam ettir.
                        if (game.onMatchEnd) {
                            console.log(`[Tournament] ${leavingPlayer.name} hükmen kaybetti. Turnuva devam ediyor.`);
                            // İstatistikleri ve maç kaydını burada da yapabiliriz.
                            await updatePlayerStats(winners.map(p => p.id), 'win');
                            await updatePlayerStats(losers.map(p => p.id), 'loss');
                            const winningTeam = winners.length > 0 ? winners[0].team : (leavingPlayer.team === 1 ? 2 : 1);
                            await saveMatch(game, winningTeam, true);
                            
                            await game.onMatchEnd(losers);
                        } 
                        // Eğer normal bir maçsa, sadece istatistikleri kaydet.
                        else {
                            const winningTeam = winners.length > 0 ? winners[0].team : (leavingPlayer.team === 1 ? 2 : 1);
                            await updatePlayerStats(winners.map(p => p.id), 'win');
                            await updatePlayerStats(losers.map(p => p.id), 'loss');
                            await saveMatch(game, winningTeam, true);
                        }
                    }
                    
                    gameState.gameRooms.delete(sock.gameRoom.id);
                    // Ayrılan oyuncunun gameRoom bilgisini temizle
                    const playerSocket = io.sockets.sockets.get(sock.id);
                    if(playerSocket) playerSocket.gameRoom = null;
                }
            }
        };

        // ... diğer listenerlar (leaveGameOrLobby, client_ready_for_game, playerMove) aynı ...
        socket.on('leaveGameOrLobby', () => {
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