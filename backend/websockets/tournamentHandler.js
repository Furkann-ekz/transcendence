// backend/websockets/tournamentHandler.js

const prisma = require('../prisma/db');
const { startGameLoop } = require('./gameHandler');
const { shuffleArray } = require('../utils/arrayUtils');

const nextMatchReadyStatus = {};
const activeCountdowns = {};

async function handlePlayerLeave(tournamentId, userId, io) {
    console.log(`[Tournament ${tournamentId}] Oyuncu ${userId} için ayrılma işlemi başlatıldı.`);
    
    // Devam eden bir geri sayım varsa kesin olarak durdur.
    if (activeCountdowns[tournamentId]) {
        clearInterval(activeCountdowns[tournamentId]);
        delete activeCountdowns[tournamentId];
        console.log(`[Tournament ${tournamentId}] Geri sayım, oyuncu ayrıldığı için iptal edildi.`);
    }

    // Bekleyen bir maç durumu varsa temizle.
    if (nextMatchReadyStatus[tournamentId]) {
        delete nextMatchReadyStatus[tournamentId];
        console.log(`[Tournament ${tournamentId}] Bekleyen maç durumu, oyuncu ayrıldığı için temizlendi.`);
    }

    try {
        // Oyuncuyu veritabanında 'elenmiş' olarak işaretle.
        await prisma.tournamentPlayer.updateMany({
            where: { tournamentId: tournamentId, userId: userId },
            data: { isEliminated: true }
        });

        // Arayüzleri güncellemek için olayı yayınla.
        const updatedPlayers = await prisma.tournamentPlayer.findMany({
            where: { tournamentId: tournamentId },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } }
        });
        io.to(tournamentId).emit('tournament_update', { players: updatedPlayers });

        // Turnuva durumunu yeniden değerlendirerek bir sonraki adımı belirle.
        // Bu, kalan oyuncuyu otomatik olarak galip ilan edebilir.
        await startNextMatch(tournamentId, io);
    } catch (error) {
        console.error(`[Tournament ${tournamentId}] Oyuncu ayrılırken hata oluştu:`, error);
    }
}

async function startNextMatch(tournamentId, io) {
    if (activeCountdowns[tournamentId]) {
        clearInterval(activeCountdowns[tournamentId]);
        delete activeCountdowns[tournamentId];
    }

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
        
        // --- GÜNCELLEME BAŞLANGICI ---
        // Veritabanında turnuvanın durumunu 'FINISHED' olarak GÜNCELLE
        const finishedTournament = await prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: 'FINISHED', winnerId: winner?.id }
        });
        
        // Bu olayı TÜM turnuva odasına (lobby) gönder.
        io.to(tournamentId).emit('tournament_finished', { winner });
        // --- GÜNCELLEME SONU ---
        
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
        if (!matchInfo || !matchInfo.players.includes(userId) || matchInfo.ready.includes(userId)) {
            return;
        }
        matchInfo.ready.push(userId);

        if (matchInfo.ready.length === 2) {
            const [player1Id, player2Id] = matchInfo.players;
            let countdown = 3;
            
            const countdownInterval = setInterval(async () => {
                io.to(tournamentId).emit('match_countdown', { secondsLeft: countdown });
                countdown--;

                if (countdown < 0) {
                    clearInterval(activeCountdowns[tournamentId]);
                    delete activeCountdowns[tournamentId];
                    
                    const playersStatus = await prisma.tournamentPlayer.findMany({
                        where: { tournamentId: tournamentId, userId: { in: [player1Id, player2Id] } }
                    });
                    if (playersStatus.length !== 2 || playersStatus.some(p => p.isEliminated)) {
                        startNextMatch(tournamentId, io);
                        return;
                    }
                    
                    const player1Socket = io.sockets.sockets.get(onlineUsers.get(player1Id)?.socketId);
                    const player2Socket = io.sockets.sockets.get(onlineUsers.get(player2Id)?.socketId);

                    if (!player1Socket || !player2Socket) {
                         startNextMatch(tournamentId, io);
                         return;
                    }

                    player1Socket.emit('go_to_match');
                    player2Socket.emit('go_to_match');

                    // --- DEĞİŞİKLİK BURADA BAŞLIYOR ---
                    const gameConfig = { canvasSize: 800, paddleSize: 100, paddleThickness: 15, tournamentId: tournamentId };
                    const p1 = await prisma.user.findUnique({ where: { id: player1Id } });
                    const p2 = await prisma.user.findUnique({ where: { id: player2Id } });

                    // Oyuncu objelerine 'x' ve 'y' koordinatları eklendi.
                    const players = [
                        { ...p1, socketId: player1Socket.id, position: 'left', team: 1, x: 0, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) },
                        { ...p2, socketId: player2Socket.id, position: 'right', team: 2, x: gameConfig.canvasSize - gameConfig.paddleThickness, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) }
                    ];
                    // --- DEĞİŞİKLİK BURADA BİTİYOR ---

                    const roomName = `tournament_match_${tournamentId}_${Date.now()}`;
                    [player1Socket, player2Socket].forEach(sock => {
                        if (sock) {
                            sock.join(roomName);
                            sock.gameRoom = { id: roomName, mode: '1v1-tournament' };
                        }
                    });

                    const onMatchEnd = async (losers) => {
                        try {
                            if (losers && losers.length > 0) {
                                await prisma.tournamentPlayer.updateMany({ where: { tournamentId: tournamentId, userId: { in: losers.map(l => l.id) } }, data: { isEliminated: true } });
                                io.to(tournamentId).emit('tournament_update', { players: await prisma.tournamentPlayer.findMany({ where: { tournamentId: tournamentId }, include: { user: { select: { id: true, name: true, avatarUrl: true } } } }) });
                            }
                        } catch (error) { console.error(`[Tournament ${tournamentId}] onMatchEnd hatası:`, error);
                        } finally { setTimeout(() => startNextMatch(tournamentId, io), 3000); }
                    };

                    const game = startGameLoop(roomName, players, io, '1v1', gameConfig, onMatchEnd);
                    gameRooms.set(roomName, game);
                }
            }, 1000);
            activeCountdowns[tournamentId] = countdownInterval;
        }
    });
}

// --- YENİ EKLENEN FONKSİYON ---
function handleRequestCurrentMatch(socket) {
    socket.on('request_current_match', async ({ tournamentId }) => {
        const matchInfo = nextMatchReadyStatus[tournamentId];

        // Eğer bu turnuva için bekleyen bir maç varsa
        if (matchInfo && matchInfo.players.length === 2) {
            console.log(`[Tournament ${tournamentId}] Oyuncu ${socket.user.name} için maç durumu yeniden gönderiliyor.`);
            const [player1Id, player2Id] = matchInfo.players;

            try {
                const player1 = await prisma.user.findUnique({ where: { id: player1Id }, select: { id: true, name: true } });
                const player2 = await prisma.user.findUnique({ where: { id: player2Id }, select: { id: true, name: true } });

                if (player1 && player2) {
                    // Eşleşme olayını sadece isteyen istemciye geri gönder
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

module.exports = {
    startNextMatch,
    handlePlayerReady,
    handleRequestCurrentMatch,
    handlePlayerLeave // Yeni fonksiyonu export ediyoruz
};