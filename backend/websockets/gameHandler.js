const prisma = require('../prisma/db');

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function updatePlayerStats(playerIds, outcome) {
    const fieldToIncrement = outcome === 'win' ? 'wins' : 'losses';
    try {
        await prisma.user.updateMany({
            where: { id: { in: playerIds } },
            data: { [fieldToIncrement]: { increment: 1 } }
        });
        console.log(`Stats updated for players ${playerIds}. Outcome: ${outcome}`);
    } catch (error) {
        console.error("Failed to update player stats:", error);
    }
}

async function saveMatch(game, winnerTeam, wasForfeit = false) {
    const { players, gameState, mode } = game;
    const team1 = players.filter(p => p.team === 1);
    const team2 = players.filter(p => p.team === 2);
    
    if (team1.length === 0 || team2.length === 0) {
        console.error("Cannot save match, one or both teams are empty.");
        return;
    }

    const player1Id = team1[0].id;
    const player2Id = team2[0].id;

    const durationInSeconds = Math.floor((Date.now() - game.startTime) / 1000);

    try {
        await prisma.match.create({
            data: {
                mode: mode,
                durationInSeconds: durationInSeconds,
                player1Id: player1Id,
                player3Id: team1[1]?.id,
                player2Id: player2Id,
                player4Id: team2[1]?.id,
                team1Score: gameState.team1Score,
                team2Score: gameState.team2Score,
                winnerTeam: winnerTeam,
                winnerId: winnerTeam === 1 ? player1Id : player2Id,
                wasForfeit: wasForfeit,
            }
        });
        console.log("Maç başarıyla kaydedildi.");
    } catch (error) { 
        console.error("Maç kaydedilemedi:", error); 
    }
}

function startGameLoop(room, players, io, mode, gameConfig) {
    const startTime = Date.now();
    const { canvasSize, paddleSize, paddleThickness } = gameConfig;
    const WINNING_SCORE = 5;
    const BALL_RADIUS = 10;
    
    // Değişiklik: gameConfig objesi de game objesine ekleniyor.
    const game = { players, mode, gameState: {}, intervalId: null, startTime: startTime, gameConfig: gameConfig };

    let gameState = {
        ballX: canvasSize / 2, ballY: canvasSize / 2, ballSpeedX: 6, ballSpeedY: 6,
        team1Score: 0, team2Score: 0,
        players: players.map(p => ({ ...p, hits: 0 }))
    };
    game.gameState = gameState;

    const intervalId = setInterval(async () => {
        gameState.ballX += gameState.ballSpeedX;
        gameState.ballY += gameState.ballSpeedY;

        gameState.players.forEach(p => {
            if (p.position === 'left' || p.position === 'right') {
                const paddleEdgeX = (p.position === 'left') ? paddleThickness : canvasSize - paddleThickness;
                const ballEdgeX = (p.position === 'left') ? gameState.ballX - BALL_RADIUS : gameState.ballX + BALL_RADIUS;

                if (((p.position === 'left' && ballEdgeX <= paddleEdgeX && gameState.ballSpeedX < 0) || (p.position === 'right' && ballEdgeX >= paddleEdgeX && gameState.ballSpeedX > 0)) &&
                    (gameState.ballY > p.y && gameState.ballY < p.y + paddleSize)) {
                    gameState.ballSpeedX = -gameState.ballSpeedX;
                    p.hits++;
                }
            } else {
                const paddleEdgeY = (p.position === 'top') ? paddleThickness : canvasSize - paddleThickness;
                const ballEdgeY = (p.position === 'top') ? gameState.ballY - BALL_RADIUS : gameState.ballY + BALL_RADIUS;

                if (((p.position === 'top' && ballEdgeY <= paddleEdgeY && gameState.ballSpeedY < 0) || (p.position === 'bottom' && ballEdgeY >= paddleEdgeY && gameState.ballSpeedY > 0)) &&
                    (gameState.ballX > p.x && gameState.ballX < p.x + paddleSize)) {
                    gameState.ballSpeedY = -gameState.ballSpeedY;
                    p.hits++;
                }
            }
        });

        let scored = false;
        let scoringTeam = null;
        if (gameState.ballX - BALL_RADIUS < 0) { scored = true; scoringTeam = 2; } 
        else if (gameState.ballX + BALL_RADIUS > canvasSize) { scored = true; scoringTeam = 1; }
        
        // Skorlama mantığında küçük bir düzeltme: 2v2 modu daha genel bir string içerebilir.
        if (mode.includes('2v2')) {
            if (gameState.ballY - BALL_RADIUS < 0) { scored = true; scoringTeam = 2; } 
            else if (gameState.ballY + BALL_RADIUS > canvasSize) { scored = true; scoringTeam = 1; }
        } else {
            if (gameState.ballY - BALL_RADIUS <= 0 || gameState.ballY + BALL_RADIUS >= canvasSize) {
                gameState.ballSpeedY = -gameState.ballSpeedY;
            }
        }
        
        if (scored) {
            if(scoringTeam === 1) gameState.team1Score++; else gameState.team2Score++;
            io.to(room).emit('gameStateUpdate', gameState);

            if (gameState.team1Score >= WINNING_SCORE || gameState.team2Score >= WINNING_SCORE) {
                clearInterval(intervalId);
                const winners = players.filter(p => p.team === scoringTeam);
                const losers = players.filter(p => p.team !== scoringTeam);
                
                await updatePlayerStats(winners.map(p => p.id), 'win');
                await updatePlayerStats(losers.map(p => p.id), 'loss');
                await saveMatch(game, scoringTeam, false);

                io.to(room).emit('gameOver', { winners, losers, reason: 'score' });
                const playerSockets = players.map(p => io.sockets.sockets.get(p.socketId)).filter(Boolean);
                playerSockets.forEach(sock => {
                    if (sock) {
                        sock.leave(room);
                        sock.gameRoom = null;
                    }
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

    game.intervalId = intervalId;

    const gameStartPayload = {
        players: players.map(p => ({id: p.id, name: p.name, email: p.email, position: p.position, team: p.team})),
        mode,
        ...gameConfig
    };
    
    return { game, gameStartPayload };
}

function handleJoinMatchmaking(io, socket, state, payload) {
    const { mode } = payload;
    if (!mode || !state.waitingPlayers[mode]) return;

    const isInAnyPool = Object.values(state.waitingPlayers).some(pool => pool.some(p => p.id === socket.id));
    if (isInAnyPool) {
        console.log(`[Matchmaking] ${socket.user.email} zaten bir bekleme havuzunda.`);
        return;
    }

    const pool = state.waitingPlayers[mode];
    pool.push(socket);
    pool.forEach(p => p.emit('updateQueue', { queueSize: pool.length, requiredSize: mode === '1v1' ? 2 : 4 }));

    let playerSockets;
    let players;
    const gameConfig = { canvasSize: 800, paddleSize: 100, paddleThickness: 15 };

    if (mode === '1v1' && pool.length >= 2) {
        playerSockets = pool.splice(0, 2);
        const [p1, p2] = playerSockets;
        players = [
            { ...p1.user, socketId: p1.id, position: 'left', team: 1, x: 0, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) },
            { ...p2.user, socketId: p2.id, position: 'right', team: 2, x: gameConfig.canvasSize - gameConfig.paddleThickness, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) }
        ];
    }

    if (mode === '2v2' && pool.length >= 4) {
        playerSockets = pool.splice(0, 4);
        shuffleArray(playerSockets);
        players = [
            { ...playerSockets[0].user, socketId: playerSockets[0].id, position: 'left', team: 1 },
            { ...playerSockets[1].user, socketId: playerSockets[1].id, position: 'top', team: 1 },
            { ...playerSockets[2].user, socketId: playerSockets[2].id, position: 'right', team: 2 },
            { ...playerSockets[3].user, socketId: playerSockets[3].id, position: 'bottom', team: 2 }
        ];
        players.forEach(p => {
            const center = (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2);
            if (p.position === 'left' || p.position === 'right') { p.x = (p.position === 'left' ? 0 : gameConfig.canvasSize - gameConfig.paddleThickness); p.y = center; }
            if (p.position === 'top' || p.position === 'bottom') { p.y = (p.position === 'top' ? 0 : gameConfig.canvasSize - gameConfig.paddleThickness); p.x = center; }
        });
    }

    if (players && playerSockets) {
        const roomName = `game_${Date.now()}`;
        playerSockets.forEach(sock => {
            sock.join(roomName);
            sock.gameRoom = { id: roomName, mode: mode };
        });
        
        const { game, gameStartPayload } = startGameLoop(roomName, players, io, mode, gameConfig);
        state.gameRooms.set(roomName, game);
        // Matchmaking de artık davet ile aynı sinyali kullanıyor
        io.to(roomName).emit('start_private_game', gameStartPayload);
    }

    // Değişiklik: playerMove dinleyicisi bu fonksiyondan tamamen kaldırıldı.
}

module.exports = {
    handleJoinMatchmaking,
    updatePlayerStats,
    saveMatch,
    startGameLoop
};