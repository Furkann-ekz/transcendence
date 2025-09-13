const prisma = require('../prisma/db'); // Prisma'nın import edildiğinden emin ol

// updatePlayerStats fonksiyonu (startGameLoop bunu kullanır)
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


// --- startGameLoop Fonksiyonunun Tam ve Güncel Hali ---
function startGameLoop(room, players, io, mode, gameConfig) {
    const { canvasSize, paddleSize, paddleThickness } = gameConfig;
    const WINNING_SCORE = 5;
    const startTime = Date.now(); // Oyun süresini ölçmek için başlangıç zamanı

    // Maç içi istatistikleri tutacak obje
    // Not: 2v2'de player1/player2, takım1/takım2'yi temsil eder.
    let matchStats = {
        // Takım 1'in temsili oyuncusunun ID'si
        player1Id: players.find(p => p.team === 1).id,
        // Takım 2'nin temsili oyuncusunun ID'si
        player2Id: players.find(p => p.team === 2).id,
        team1Hits: 0,
        team1Misses: 0,
        team2Hits: 0,
        team2Misses: 0
    };

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

    const intervalId = setInterval(async () => {
        gameState.ballX += gameState.ballSpeedX;
        gameState.ballY += gameState.ballSpeedY;

        // Raketlerle çarpışma ve isabet (hit) sayısını arttırma
        let hitOccurred = false;
        gameState.players.forEach(p => {
            let collision = false;
            if ((p.position === 'left' && gameState.ballX <= paddleThickness && gameState.ballSpeedX < 0) || 
                (p.position === 'right' && gameState.ballX >= canvasSize - paddleThickness && gameState.ballSpeedX > 0)) {
                if (gameState.ballY > p.y && gameState.ballY < p.y + paddleSize) {
                    gameState.ballSpeedX = -gameState.ballSpeedX;
                    collision = true;
                }
            } else if ((p.position === 'top' && gameState.ballY <= paddleThickness && gameState.ballSpeedY < 0) ||
                       (p.position === 'bottom' && gameState.ballY >= canvasSize - paddleThickness && gameState.ballSpeedY > 0)) {
                if (gameState.ballX > p.x && gameState.ballX < p.x + paddleSize) {
                    gameState.ballSpeedY = -gameState.ballSpeedY;
                    collision = true;
                }
            }
            if (collision && !hitOccurred) {
                if (p.team === 1) matchStats.team1Hits++;
                else matchStats.team2Hits++;
                hitOccurred = true; // Bir frame'de sadece bir hit say
            }
        });

        // Skorlama ve ıskalama (miss) sayısını arttırma
        let scored = false;
        let scoringTeam = null;
        let defendingTeam = null;

        if (gameState.ballX < 0) { scoringTeam = 2; defendingTeam = 1; scored = true; } 
        else if (gameState.ballX > canvasSize) { scoringTeam = 1; defendingTeam = 2; scored = true; }
        
        if (mode === '2v2') {
            if (gameState.ballY < 0) { scoringTeam = 2; defendingTeam = 1; scored = true; } 
            else if (gameState.ballY > canvasSize) { scoringTeam = 1; defendingTeam = 2; scored = true; }
        } else { // 1v1 modunda üst/alt duvarlardan seker
            if (gameState.ballY <= 0 || gameState.ballY >= canvasSize) { gameState.ballSpeedY = -gameState.ballSpeedY; }
        }
        
        if (scored) {
            // Skoru ve ıskalama sayısını arttır
            if(scoringTeam === 1) gameState.team1Score++; else gameState.team2Score++;
            if(defendingTeam === 1) matchStats.team1Misses++; else matchStats.team2Misses++;
            
            // Final skoru içeren son durumu herkese gönder
            io.to(room).emit('gameStateUpdate', gameState);

            // Oyunun bitip bitmediğini kontrol et
            if (gameState.team1Score >= WINNING_SCORE || gameState.team2Score >= WINNING_SCORE) {
                clearInterval(intervalId);
                
                const winners = players.filter(p => p.team === scoringTeam);
                const losers = players.filter(p => p.team !== scoringTeam);
                const durationInSeconds = Math.round((Date.now() - startTime) / 1000);
                
                // Maçı Veritabanına Kaydet
                try {
                    await prisma.match.create({
                        data: {
                            durationInSeconds: durationInSeconds,
                            player1Id: matchStats.player1Id,
                            player2Id: matchStats.player2Id,
                            player1Score: gameState.team1Score,
                            player2Score: gameState.team2Score,
                            winnerId: scoringTeam === 1 ? matchStats.player1Id : matchStats.player2Id,
                            player1Hits: matchStats.team1Hits,
                            player1Misses: matchStats.team1Misses,
                            player2Hits: matchStats.team2Hits,
                            player2Misses: matchStats.team2Misses,
                        }
                    });
                    console.log("Maç başarıyla kaydedildi.");
                } catch (error) { console.error("Maç kaydedilemedi:", error); }
                
                await updatePlayerStats(winners.map(p => p.id), 'win');
                await updatePlayerStats(losers.map(p => p.id), 'loss');
                
                io.to(room).emit('gameOver', { winners, losers });
                
                const playerSockets = players.map(p => io.sockets.sockets.get(p.socketId)).filter(Boolean);
                playerSockets.forEach(sock => { sock.leave(room); sock.gameRoom = null; });
                
                return; 
            }
            
            // Oyun bitmediyse topu sıfırla
            gameState.ballX = gameConfig.canvasSize / 2;
            gameState.ballY = gameConfig.canvasSize / 2;
            gameState.ballSpeedX = -gameState.ballSpeedX;
        }
        
        // Skor olmadıysa normal oyun durumunu gönder
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