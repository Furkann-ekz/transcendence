// backend/websockets/tournamentHandler.js

const prisma = require('../prisma/db');
const { startGameLoop } = require('./gameHandler');

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function startNextMatch(tournamentId, io, onlineUsers, gameRooms) {
    console.log(`[Tournament ${tournamentId}] Bir sonraki maç başlatılıyor...`);

    const playersInTournament = await prisma.tournamentPlayer.findMany({
        where: { tournamentId: tournamentId, isEliminated: false },
        include: { user: true }
    });
    const activePlayers = playersInTournament.map(p => p.user);

    if (activePlayers.length <= 1) {
        const winner = activePlayers.length > 0 ? activePlayers[0] : null;
        console.log(`[Tournament ${tournamentId}] Turnuva bitti. Kazanan: ${winner?.name}`);
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: 'FINISHED', winnerId: winner?.id }
        });
        io.to(tournamentId).emit('tournament_finished', { winner });
        return;
    }

    const shuffledPlayers = shuffleArray(activePlayers);
    const player1 = shuffledPlayers[0];
    const player2 = shuffledPlayers[1];

    console.log(`[Tournament ${tournamentId}] Eşleşme: ${player1.name} vs ${player2.name}`);

    io.to(tournamentId).emit('new_match_starting', {
        player1: { id: player1.id, name: player1.name },
        player2: { id: player2.id, name: player2.name }
    });

    let countdown = 10;
    const countdownInterval = setInterval(() => {
        io.to(tournamentId).emit('match_countdown', { secondsLeft: countdown });
        countdown--;

        if (countdown < 0) {
            clearInterval(countdownInterval);
            console.log(`[Tournament ${tournamentId}] Geri sayım bitti. Maç başlıyor.`);

            // OYUNU BAŞLATMA MANTIĞI BURADA
            const player1SocketInfo = onlineUsers.get(player1.id);
            const player2SocketInfo = onlineUsers.get(player2.id);

            const player1Socket = player1SocketInfo ? io.sockets.sockets.get(player1SocketInfo.socketId) : null;
            const player2Socket = player2SocketInfo ? io.sockets.sockets.get(player2SocketInfo.socketId) : null;

            if (!player1Socket || !player2Socket) {
                console.error(`[Tournament ${tournamentId}] Oyuncular online değil, maç başlatılamadı.`);
                // TODO: Burada bir oyuncu online değilse, diğerini otomatik galip ilan et ve bir sonraki tura geçir.
                // Şimdilik sadece logluyoruz.
                return;
            }

            const gameConfig = { canvasSize: 800, paddleSize: 100, paddleThickness: 15 };
            const roomName = `tournament_match_${tournamentId}_${Date.now()}`;
            
            const playerSockets = [player1Socket, player2Socket];
            const players = [
                { ...player1, socketId: player1Socket.id, position: 'left', team: 1, x: 0, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) },
                { ...player2, socketId: player2Socket.id, position: 'right', team: 2, x: gameConfig.canvasSize - gameConfig.paddleThickness, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) }
            ];

            playerSockets.forEach(sock => {
                sock.join(roomName);
                sock.gameRoom = { id: roomName, mode: '1v1-tournament' };
            });

            const game = startGameLoop(roomName, players, io, '1v1', gameConfig);
            gameRooms.set(roomName, game);
        }
    }, 1000);
}

module.exports = { startNextMatch };