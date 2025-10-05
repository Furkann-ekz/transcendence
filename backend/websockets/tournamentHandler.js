// backend/websockets/tournamentHandler.js

const prisma = require('../prisma/db');
const { startGameLoop } = require('./gameHandler');

const nextMatchReadyStatus = {};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function startNextMatch(tournamentId, io) {
    console.log(`[Tournament ${tournamentId}] === YENİ TUR BAŞLADI ===`);

    const playersInTournament = await prisma.tournamentPlayer.findMany({
        where: { tournamentId: tournamentId, isEliminated: false },
        include: { user: { select: { id: true, name: true } } }
    });
    
    console.log(`[Tournament ${tournamentId}] Veritabanında ${playersInTournament.length} aktif oyuncu bulundu.`);
    if (playersInTournament.length > 0) {
        console.log(`[Tournament ${tournamentId}] Aktif oyuncuların isimleri: ${playersInTournament.map(p => p.user.name).join(', ')}`);
    }

    const activePlayers = playersInTournament.map(p => p.user);

    if (activePlayers.length <= 1) {
        const winner = activePlayers.length > 0 ? activePlayers[0] : null;
        console.log(`[Tournament ${tournamentId}] Turnuva bitti. Kazanan: ${winner?.name}`);
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: 'FINISHED', winnerId: winner?.id }
        });
        io.to(tournamentId).emit('tournament_finished', { winner });
        delete nextMatchReadyStatus[tournamentId];
        return;
    }

    const shuffledPlayers = shuffleArray(activePlayers);
    const player1 = shuffledPlayers[0];
    const player2 = shuffledPlayers[1];
    
    nextMatchReadyStatus[tournamentId] = {
        players: [player1.id, player2.id],
        ready: []
    };

    console.log(`[Tournament ${tournamentId}] Eşleşme: ${player1.name} vs ${player2.name}. Onay bekleniyor.`);

    io.to(tournamentId).emit('new_match_starting', {
        player1: { id: player1.id, name: player1.name },
        player2: { id: player2.id, name: player2.name }
    });
}

function handlePlayerReady(socket, io, onlineUsers, gameRooms) {
    socket.on('player_ready_for_next_match', async ({ tournamentId }) => {
        const userId = socket.user.id;
        const matchInfo = nextMatchReadyStatus[tournamentId];
        if (!matchInfo || !matchInfo.players.includes(userId) || matchInfo.ready.includes(userId)) { return; }

        matchInfo.ready.push(userId);
        console.log(`[Tournament ${tournamentId}] Oyuncu ${socket.user.name} hazır. Hazır oyuncu sayısı: ${matchInfo.ready.length}`);

        if (matchInfo.ready.length === 2) {
            console.log(`[Tournament ${tournamentId}] Her iki oyuncu da hazır. Maç başlatılıyor.`);
            
            const [player1Id, player2Id] = matchInfo.players;
            const player1Socket = io.sockets.sockets.get(onlineUsers.get(player1Id)?.socketId);
            const player2Socket = io.sockets.sockets.get(onlineUsers.get(player2Id)?.socketId);

            if (!player1Socket || !player2Socket) {
                console.error(`[Tournament ${tournamentId}] Oyuncular hazır dedi ama online değil.`);
                const offlinePlayerId = !player1Socket ? player1Id : player2Id;
                await prisma.tournamentPlayer.updateMany({ where: { tournamentId: tournamentId, userId: offlinePlayerId }, data: { isEliminated: true }});
                setTimeout(() => startNextMatch(tournamentId, io), 3000);
                return;
            }

            let countdown = 3;
            const countdownInterval = setInterval(async () => {
                if (player1Socket) player1Socket.emit('match_countdown', { secondsLeft: countdown });
                if (player2Socket) player2Socket.emit('match_countdown', { secondsLeft: countdown });
                countdown--;

                if (countdown < 0) {
                    clearInterval(countdownInterval);
                    
                    if (nextMatchReadyStatus[tournamentId]) {
                        delete nextMatchReadyStatus[tournamentId].intervalId;
                    }

                    player1Socket.emit('go_to_match');
                    player2Socket.emit('go_to_match');
                    
                    const gameConfig = { canvasSize: 800, paddleSize: 100, paddleThickness: 15, tournamentId: tournamentId };
                    const roomName = `tournament_match_${tournamentId}_${Date.now()}`;
                    
                    const p1 = await prisma.user.findUnique({ where: { id: player1Id } });
                    const p2 = await prisma.user.findUnique({ where: { id: player2Id } });
                    const players = [
                        { ...p1, socketId: player1Socket.id, position: 'left', team: 1, x: 0, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) },
                        { ...p2, socketId: player2Socket.id, position: 'right', team: 2, x: gameConfig.canvasSize - gameConfig.paddleThickness, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) }
                    ];
                    
                    [player1Socket, player2Socket].forEach(sock => {
                        sock.join(roomName);
                        sock.gameRoom = { id: roomName, mode: '1v1-tournament' };
                    });
                    
                    const onMatchEnd = async (losers) => {
                        try {
                            if (losers && losers.length > 0) {
                                const loserIds = losers.map(l => l.id);
                                await prisma.tournamentPlayer.updateMany({ where: { tournamentId: tournamentId, userId: { in: loserIds } }, data: { isEliminated: true } });
                                const updatedPlayers = await prisma.tournamentPlayer.findMany({ where: { tournamentId: tournamentId }, include: { user: { select: { id: true, name: true, avatarUrl: true } } } });
                                io.to(tournamentId).emit('tournament_update', { players: updatedPlayers });
                            }
                        } catch (error) {
                            console.error(`[Tournament ${tournamentId}] onMatchEnd hatası:`, error);
                        } finally {
                            setTimeout(() => startNextMatch(tournamentId, io), 3000);
                        }
                    };
                    
                    const game = startGameLoop(roomName, players, io, '1v1', gameConfig, onMatchEnd);
                    gameRooms.set(roomName, game);
                }
            }, 1000);

            if (nextMatchReadyStatus[tournamentId]) {
                nextMatchReadyStatus[tournamentId].intervalId = countdownInterval;
            }
        }
    });
}

function handleRequestCurrentMatch(socket) {
    socket.on('request_current_match', async ({ tournamentId }) => {
        const matchInfo = nextMatchReadyStatus[tournamentId];

        if (matchInfo && matchInfo.players.length === 2) {
            console.log(`[Tournament ${tournamentId}] Oyuncu ${socket.user.name} için maç durumu yeniden gönderiliyor.`);
            const [player1Id, player2Id] = matchInfo.players;

            try {
                const player1 = await prisma.user.findUnique({ where: { id: player1Id }, select: { id: true, name: true } });
                const player2 = await prisma.user.findUnique({ where: { id: player2Id }, select: { id: true, name: true } });

                if (player1 && player2) {
                    socket.emit('new_match_starting', {
                        player1: { id: player1.id, name: player1.name },
                        player2: { id: player2.id, name: player2.name }
                    });
                }
            } catch (error) {
                console.error("Mevcut maç için oyuncu verileri çekilirken hata:", error);
            }
        }
    });
}

module.exports = { startNextMatch, handlePlayerReady, handleRequestCurrentMatch, nextMatchReadyStatus };