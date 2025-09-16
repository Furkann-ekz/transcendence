// backend/websockets/gameHandler.js
const prisma = require('../prisma/db'); // Prisma'yı en üste import ediyoruz

// Bu fonksiyon, bir array'i karıştırmak için kullanılır
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// YARDIMCI FONKSİYON: Oyuncuların istatistiklerini günceller
async function updatePlayerStats(playerIds, outcome) {
    const fieldToIncrement = outcome === 'win' ? 'wins' : 'losses';
    try {
        await prisma.user.updateMany({
            where: {
                id: { in: playerIds }
            },
            data: {
                [fieldToIncrement]: {
                    increment: 1
                }
            }
        });
        console.log(`Stats updated for players ${playerIds}. Outcome: ${outcome}`);
    } catch (error) {
        console.error("Failed to update player stats:", error);
    }
}

function startGameLoop(room, players, io, mode, gameConfig) {
    const { canvasSize, paddleSize, paddleThickness } = gameConfig;
    const WINNING_SCORE = 5; // Kazanma skoru

    let gameState = {
        ballX: canvasSize / 2,
        ballY: canvasSize / 2,
        ballSpeedX: 6,
        ballSpeedY: 6,
        team1Score: 0,
        team2Score: 0,
        players: players.map(p => ({
            id: p.id,
            position: p.position,
            team: p.team,
            x: p.x,
            y: p.y
        }))
    };

    const intervalId = setInterval(async () => { // Fonksiyonu 'async' yapıyoruz
        gameState.ballX += gameState.ballSpeedX;
        gameState.ballY += gameState.ballSpeedY;

        gameState.players.forEach(p => {
            if (p.position === 'left' && gameState.ballX <= paddleThickness && gameState.ballY > p.y && gameState.ballY < p.y + paddleSize) gameState.ballSpeedX = -gameState.ballSpeedX;
            if (p.position === 'right' && gameState.ballX >= canvasSize - paddleThickness && gameState.ballY > p.y && gameState.ballY < p.y + paddleSize) gameState.ballSpeedX = -gameState.ballSpeedX;
            if (p.position === 'top' && gameState.ballY <= paddleThickness && gameState.ballX > p.x && gameState.ballX < p.x + paddleSize) gameState.ballSpeedY = -gameState.ballSpeedY;
            if (p.position === 'bottom' && gameState.ballY >= canvasSize - paddleThickness && gameState.ballX > p.x && gameState.ballX < p.x + paddleSize) gameState.ballSpeedY = -gameState.ballSpeedY;
        });

        let scored = false;
        let scoringTeam = null;

        if (gameState.ballX < 0) { const player = gameState.players.find(p => p.position === 'left'); scoringTeam = player.team === 1 ? 2 : 1; scored = true; } 
        else if (gameState.ballX > canvasSize) { const player = gameState.players.find(p => p.position === 'right'); scoringTeam = player.team === 1 ? 2 : 1; scored = true; }
        if (mode === '2v2') {
            if (gameState.ballY < 0) { const player = gameState.players.find(p => p.position === 'top'); scoringTeam = player.team === 1 ? 2 : 1; scored = true; } 
            else if (gameState.ballY > canvasSize) { const player = gameState.players.find(p => p.position === 'bottom'); scoringTeam = player.team === 1 ? 2 : 1; scored = true; }
        } else { if (gameState.ballY <= 0 || gameState.ballY >= canvasSize) { gameState.ballSpeedY = -gameState.ballSpeedY; } }
        
        if (scored) {
            if(scoringTeam === 1) gameState.team1Score++;
            else gameState.team2Score++;
            
            io.to(room).emit('gameStateUpdate', gameState);

            if (gameState.team1Score >= WINNING_SCORE || gameState.team2Score >= WINNING_SCORE) {
                clearInterval(intervalId);
                
                const winners = players.filter(p => p.team === scoringTeam);
                const losers = players.filter(p => p.team !== scoringTeam);
                const winnerIds = winners.map(p => p.id);
                const loserIds = losers.map(p => p.id);

                await updatePlayerStats(winnerIds, 'win');
                await updatePlayerStats(loserIds, 'loss');

                io.to(room).emit('gameOver', { winners, losers });
                
                const playerSockets = players.map(p => io.sockets.sockets.get(p.socketId)).filter(Boolean);
                playerSockets.forEach(sock => {
                    sock.leave(room);
                    sock.gameRoom = null;
                });
                
                return; 
            }
            
            gameState.ballX = gameConfig.canvasSize / 2;
            gameState.ballY = gameConfig.canvasSize / 2;
            gameState.ballSpeedX = -gameState.ballSpeedX;
        }
        
        if (!scored) {
            io.to(room).emit('gameStateUpdate', gameState);
        }
    }, 1000 / 60);

    const gameStartPayload = {
        players: players.map(p => ({id: p.id, name: p.name, email: p.email, position: p.position, team: p.team})),
        mode,
        ...gameConfig
    };

    io.to(room).emit('gameStart', gameStartPayload);
    return { players, intervalId, gameState };
}


function gameHandler(io, socket, state, payload) {
    const { mode } = payload;
    if (!mode || !state.waitingPlayers[mode]) return;

    const isInAnyPool = Object.values(state.waitingPlayers).some(pool => pool.some(p => p.id === socket.id));
    if (isInAnyPool) {
        console.log(`[Matchmaking] ${socket.user.email} zaten bir bekleme havuzunda.`);
        return;
    }

    const pool = state.waitingPlayers[mode];
    pool.push(socket);
    console.log(`[Matchmaking] ${socket.user.email} -> ${mode} havuzuna eklendi. (Havuzda ${pool.length} kişi var)`);
    pool.forEach(p => p.emit('updateQueue', { queueSize: pool.length, requiredSize: mode === '1v1' ? 2 : 4 }));

    let playerSockets;
    let players;
    const gameConfig = { canvasSize: 800, paddleSize: 100, paddleThickness: 15 };

    if (mode === '1v1' && pool.length >= 2) {
        console.log(`[Matchmaking] 1v1 için yeterli oyuncu bulundu.`);
        playerSockets = pool.splice(0, 2);
        const [p1, p2] = playerSockets;
        players = [
            { ...p1.user, socketId: p1.id, position: 'left', team: 1, x: 0, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) },
            { ...p2.user, socketId: p2.id, position: 'right', team: 2, x: gameConfig.canvasSize - gameConfig.paddleThickness, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) }
        ];
    }

    if (mode === '2v2' && pool.length >= 4) {
        console.log(`[Matchmaking] 2v2 için yeterli oyuncu bulundu.`);
        playerSockets = pool.splice(0, 4);
        shuffleArray(playerSockets);
        const teamConfig = Math.random() < 0.5 ? 1 : 2;
        console.log(`[Matchmaking] 2v2 Takım Konfigürasyonu: ${teamConfig}`);
        if (teamConfig === 1) {
            players = [
                { ...playerSockets[0].user, socketId: playerSockets[0].id, position: 'left', team: 1 },
                { ...playerSockets[1].user, socketId: playerSockets[1].id, position: 'top', team: 1 },
                { ...playerSockets[2].user, socketId: playerSockets[2].id, position: 'right', team: 2 },
                { ...playerSockets[3].user, socketId: playerSockets[3].id, position: 'bottom', team: 2 }
            ];
        } else {
            players = [
                { ...playerSockets[0].user, socketId: playerSockets[0].id, position: 'left', team: 1 },
                { ...playerSockets[1].user, socketId: playerSockets[1].id, position: 'bottom', team: 1 },
                { ...playerSockets[2].user, socketId: playerSockets[2].id, position: 'right', team: 2 },
                { ...playerSockets[3].user, socketId: playerSockets[3].id, position: 'top', team: 2 }
            ];
        }
        players.forEach(p => {
            const center = (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2);
            if (p.position === 'left') { p.x = 0; p.y = center; }
            if (p.position === 'right') { p.x = gameConfig.canvasSize - gameConfig.paddleThickness; p.y = center; }
            if (p.position === 'top') { p.y = 0; p.x = center; }
            if (p.position === 'bottom') { p.y = gameConfig.canvasSize - gameConfig.paddleThickness; p.x = center; }
        });
    }

    if (players && playerSockets) {
        const roomName = `game_${Date.now()}`;
        playerSockets.forEach(sock => {
            sock.join(roomName);
            sock.gameRoom = { id: roomName, mode: mode };
        });
        const game = startGameLoop(roomName, players, io, mode, gameConfig);
        state.gameRooms.set(roomName, game);
        console.log(`[Matchmaking] Oda (${roomName}) oluşturuldu ve ${mode} oyunu başlatıldı.`);
    }

    socket.on('playerMove', (data) => {
        if (!socket.gameRoom) return;
        const game = state.gameRooms.get(socket.gameRoom.id);
        if (!game) return;
        const playerState = game.gameState.players.find(p => p.id === socket.user.id);
        if (!playerState) return;
        const { newPosition } = data;
        const { canvasSize, paddleSize } = gameConfig;
        let finalPosition = newPosition;
        if (finalPosition < 0) finalPosition = 0;
        if (finalPosition > canvasSize - paddleSize) finalPosition = canvasSize - paddleSize;
        if (playerState.position === 'left' || playerState.position === 'right') playerState.y = finalPosition;
        if (playerState.position === 'top' || playerState.position === 'bottom') playerState.x = finalPosition;
    });
}

module.exports = gameHandler;
