// backend/websockets/tournamentHandler.js

const prisma = require('../prisma/db');
const { startGameLoop } = require('./gameHandler');

// Her turnuva için sıradaki maça hazır olan oyuncuları takip edecek obje
const nextMatchReadyStatus = {};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Bu fonksiyon artık sadece sıradaki maçı DUYURUR, başlatmaz.
async function startNextMatch(tournamentId, io) {
    console.log(`[Tournament ${tournamentId}] Sıradaki maç için oyuncular belirleniyor...`);

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
        delete nextMatchReadyStatus[tournamentId]; // Turnuva bitince hafızayı temizle
        return;
    }

    const shuffledPlayers = shuffleArray(activePlayers);
    const player1 = shuffledPlayers[0];
    const player2 = shuffledPlayers[1];
    
    // Sıradaki maç için hazır durumunu sıfırla
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

// Oyuncunun "Hazırım" sinyalini işleyecek YENİ fonksiyon
function handlePlayerReady(socket, io, onlineUsers, gameRooms) {
    socket.on('player_ready_for_next_match', async ({ tournamentId }) => {
        const userId = socket.user.id;
        const matchInfo = nextMatchReadyStatus[tournamentId];

        // Eğer oyuncu sıradaki maçta değilse veya zaten hazırsa işlemi yoksay
        if (!matchInfo || !matchInfo.players.includes(userId) || matchInfo.ready.includes(userId)) {
            return;
        }

        matchInfo.ready.push(userId);
        console.log(`[Tournament ${tournamentId}] Oyuncu ${socket.user.name} hazır. Hazır oyuncu sayısı: ${matchInfo.ready.length}`);

        // Herkes hazır mı kontrol et
        if (matchInfo.ready.length === 2) {
            console.log(`[Tournament ${tournamentId}] Her iki oyuncu da hazır. Maç başlatılıyor.`);
            
            const [player1Id, player2Id] = matchInfo.players;

            const player1SocketInfo = onlineUsers.get(player1Id);
            const player2SocketInfo = onlineUsers.get(player2Id);

            const player1Socket = player1SocketInfo ? io.sockets.sockets.get(player1SocketInfo.socketId) : null;
            const player2Socket = player2SocketInfo ? io.sockets.sockets.get(player2SocketInfo.socketId) : null;

            // Oyuncular online değilse (çok düşük ihtimal ama kontrol etmekte fayda var)
            if (!player1Socket || !player2Socket) {
                console.error(`[Tournament ${tournamentId}] Oyuncular hazır dedi ama online değil. Turnuva döngüsü yeniden başlatılıyor.`);
                startNextMatch(tournamentId, io); // Döngüyü yeniden tetikle
                return;
            }

            // Geri sayımı başlat ve maçı kur
            let countdown = 3; // Süreyi 3 saniyeye düşürdük
            const countdownInterval = setInterval(async () => {
                io.to(tournamentId).emit('match_countdown', { secondsLeft: countdown });
                countdown--;

                if (countdown < 0) {
                    clearInterval(countdownInterval);
                    const gameConfig = { canvasSize: 800, paddleSize: 100, paddleThickness: 15, tournamentId: tournamentId };
                    const roomName = `tournament_match_${tournamentId}_${Date.now()}`;
                    
                    const p1 = await prisma.user.findUnique({ where: { id: player1Id } });
                    const p2 = await prisma.user.findUnique({ where: { id: player2Id } });

                    const players = [
                        { ...p1, socketId: player1Socket.id, position: 'left', team: 1 },
                        { ...p2, socketId: player2Socket.id, position: 'right', team: 2 }
                    ];

                    [player1Socket, player2Socket].forEach(sock => sock.join(roomName));
                    
                    const onMatchEnd = async (losers) => {
                        try {
                            if (losers && losers.length > 0) {
                                const loserIds = losers.map(l => l.id);
                                await prisma.tournamentPlayer.updateMany({
                                    where: { tournamentId: tournamentId, userId: { in: loserIds } },
                                    data: { isEliminated: true },
                                });
                                const updatedPlayers = await prisma.tournamentPlayer.findMany({
                                    where: { tournamentId: tournamentId },
                                    include: { user: { select: { id: true, name: true, avatarUrl: true } } }
                                });
                                io.to(tournamentId).emit('tournament_update', { players: updatedPlayers });
                            }
                        } catch (error) {
                            console.error(`[Tournament ${tournamentId}] onMatchEnd hatası:`, error);
                        } finally {
                            setTimeout(() => startNextMatch(tournamentId, io), 3000);
                        }
                    };
                    
                    startGameLoop(roomName, players, io, '1v1', gameConfig, onMatchEnd);
                }
            }, 1000);
        }
    });
}


// Fonksiyonları export etme şeklini güncelliyoruz
module.exports = { startNextMatch, handlePlayerReady };