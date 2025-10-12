const { shuffleArray } = require('../utils/arrayUtils');
const prisma = require('../prisma/db');

function getGameConfig(customSettings = null) {
	const defaultConfig = {
		canvasSize: 800,
		paddleSize: 100,
		paddleThickness: 15,
		ballSpeed: 8,
		paddleSpeed: 15,
		ballSize: 10,
		mode: 'classic',
		powerupsEnabled: false,
		enabledPowerups: {
			speedBoost: false,
			paddleExtend: false,
			multiBall: false,
			freeze: false
		}
	};

	if (!customSettings)
		return (defaultConfig);

	return {
		canvasSize: Math.max(customSettings.mapWidth || defaultConfig.canvasSize, customSettings.mapHeight || defaultConfig.canvasSize),
		paddleSize: Math.max(60, Math.min(150, customSettings.paddleHeight || defaultConfig.paddleSize)),
		paddleThickness: Math.max(8, Math.min(20, customSettings.paddleThickness || defaultConfig.paddleThickness)),
		ballSpeed: Math.max(3, Math.min(15, customSettings.ballSpeed || defaultConfig.ballSpeed)),
		paddleSpeed: Math.max(5, Math.min(20, customSettings.paddleSpeed || defaultConfig.paddleSpeed)),
		ballSize: Math.max(8, Math.min(20, customSettings.ballSize || defaultConfig.ballSize)),
		mode: customSettings.mode || defaultConfig.mode,
		powerupsEnabled: customSettings.mode === 'powerup',
		enabledPowerups: customSettings.enabledPowerups || defaultConfig.enabledPowerups
	};
}

async function updatePlayerStats(playerIds, outcome)
{
	const fieldToIncrement = outcome === 'win' ? 'wins' : 'losses';
	try
	{
		await prisma.user.updateMany({
			where: { id: { in: playerIds } },
			data: { [fieldToIncrement]: { increment: 1 } }
		});
		console.log(`Stats updated for players ${playerIds}. Outcome: ${outcome}`);
	}
	catch (error)
	{
		console.error("Failed to update player stats:", error);
	}
}

async function saveMatch(game, winnerTeam, wasForfeit = false)
{
	const { players, gameState, mode } = game;
	const team1 = players.filter(p => p.team === 1);
	const team2 = players.filter(p => p.team === 2);
	
	if (team1.length === 0 || team2.length === 0)
	{
		if (!wasForfeit)
			console.error("Cannot save match, one or both teams are empty.");
		return ;
	}
	
	const player1Id = team1[0]?.id;
	const player2Id = team2[0]?.id;
	if (!player1Id || !player2Id)
	{
		console.error("Cannot save match, player IDs are missing.");
		return ;
	}

	const durationInSeconds = Math.floor((Date.now() - game.startTime) / 1000);

	try
	{
		await prisma.match.create({
			data:
			{
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
	}
	catch (error)
	{ 
		console.error("Maç kaydedilemedi:", error); 
	}
}

async function cleanUpPlayer(sock, io, gameRooms)
{
	if (!sock || !sock.gameRoom)
		return;

	const gameRoomId = sock.gameRoom.id;
	sock.gameRoom = null;

	const game = gameRooms.get(gameRoomId);
	if (game)
	{
		clearInterval(game.intervalId);
		const leavingPlayer = game.players.find(p => p.socketId === sock.id);
		
		if (leavingPlayer)
		{
			const losingTeamId = leavingPlayer.team;
			const winningTeamId = losingTeamId === 1 ? 2 : 1;

			const losers = game.players.filter(p => p.team === losingTeamId);
			const winners = game.players.filter(p => p.team === winningTeamId);

			const allRemainingPlayers = winners.concat(losers.filter(p => p.id !== leavingPlayer.id));

			allRemainingPlayers.forEach(p =>
			{
				const playerSocket = io.sockets.sockets.get(p.socketId);
				if (playerSocket)
					playerSocket.emit('gameOver', { winners, losers, reason: 'forfeit' });
			});
			
			await updatePlayerStats(winners.map(p => p.id), 'win');
			await updatePlayerStats(losers.map(p => p.id), 'loss');
			await saveMatch(game, winningTeamId, true);
			
			if (game.onMatchEnd)
			{
				console.log(`[Tournament] ${leavingPlayer.name}'nin takımı hükmen kaybetti.`);
				await game.onMatchEnd(losers);
			}
		}
		
		gameRooms.delete(gameRoomId);
		console.log(`[Game] Oda ${gameRoomId} temizlendi.`);
	}
}

function startGameLoop(room, players, io, mode, gameConfig, onMatchEnd)
{
	const startTime = Date.now();
	const WINNING_SCORE = 20;
	const BALL_RADIUS = 10;

	const game =
	{ 
		players, 
		mode, 
		gameState: {}, 
		intervalId: null, 
		startTime: startTime, 
		onMatchEnd: onMatchEnd,
		...gameConfig 
	};

	let gameState =
	{
		ballX: gameConfig.canvasSize / 2, ballY: gameConfig.canvasSize / 2,
		ballSpeedX: gameConfig.ballSpeed || 8, ballSpeedY: (gameConfig.ballSpeed || 8) * 0.75,
		team1Score: 0, team2Score: 0,
		players: players.map(p => ({ ...p, hits: 0 }))
	};
	game.gameState = gameState;

	const intervalId = setInterval(async () =>
	{
		gameState.ballX += gameState.ballSpeedX;
		gameState.ballY += gameState.ballSpeedY;

		gameState.players.forEach(p => {
			if (p.position === 'left' || p.position === 'right')
			{
				const paddleEdgeX = (p.position === 'left') ? gameConfig.paddleThickness : gameConfig.canvasSize - gameConfig.paddleThickness;
				const ballEdgeX = (p.position === 'left') ? gameState.ballX - BALL_RADIUS : gameState.ballX + BALL_RADIUS;
				if (((p.position === 'left' && ballEdgeX <= paddleEdgeX && gameState.ballSpeedX < 0) || (p.position === 'right' && ballEdgeX >= paddleEdgeX && gameState.ballSpeedX > 0)) && (gameState.ballY > p.y && gameState.ballY < p.y + gameConfig.paddleSize))
					gameState.ballSpeedX = -gameState.ballSpeedX;
			}
			else
			{
				const paddleEdgeY = (p.position === 'top') ? gameConfig.paddleThickness : gameConfig.canvasSize - gameConfig.paddleThickness;
				const ballEdgeY = (p.position === 'top') ? gameState.ballY - BALL_RADIUS : gameState.ballY + BALL_RADIUS;
				if (((p.position === 'top' && ballEdgeY <= paddleEdgeY && gameState.ballSpeedY < 0) || (p.position === 'bottom' && ballEdgeY >= paddleEdgeY && gameState.ballSpeedY > 0)) && (gameState.ballX > p.x && gameState.ballX < p.x + gameConfig.paddleSize))
					gameState.ballSpeedY = -gameState.ballSpeedY;
			}
		});

		let scored = false;
		let scoringTeam = null;
		if (gameState.ballX - BALL_RADIUS < 0)
		{
			const player = gameState.players.find(p => p.position === 'left');
			scoringTeam = player.team === 1 ? 2 : 1; scored = true;
		} 
		else if (gameState.ballX + BALL_RADIUS > gameConfig.canvasSize)
		{
			const player = gameState.players.find(p => p.position === 'right');
			scoringTeam = player.team === 1 ? 2 : 1; scored = true;
		}
		
		if (mode === '2v2')
		{
			if (gameState.ballY - BALL_RADIUS < 0)
			{
				const player = gameState.players.find(p => p.position === 'top');
				scoringTeam = player.team === 1 ? 2 : 1; scored = true;
			} 
			else if (gameState.ballY + BALL_RADIUS > gameConfig.canvasSize)
			{
				const player = gameState.players.find(p => p.position === 'bottom');
				scoringTeam = player.team === 1 ? 2 : 1; scored = true;
			}
		}
		else
			if (gameState.ballY - BALL_RADIUS <= 0 || gameState.ballY + BALL_RADIUS >= gameConfig.canvasSize)
				gameState.ballSpeedY = -gameState.ballSpeedY;
		
		if (scored)
		{
			if (scoringTeam === 1)
				gameState.team1Score++;
			else
				gameState.team2Score++;
			io.to(room).emit('gameStateUpdate', gameState);

			if (gameState.team1Score >= WINNING_SCORE || gameState.team2Score >= WINNING_SCORE)
			{
				clearInterval(intervalId);
				const winners = players.filter(p => p.team === scoringTeam);
				const losers = players.filter(p => p.team !== scoringTeam);
				
				await updatePlayerStats(winners.map(p => p.id), 'win');
				await updatePlayerStats(losers.map(p => p.id), 'loss');
				
				await saveMatch(game, scoringTeam, false);

				io.to(room).emit('gameOver', { winners, losers, reason: 'score' });
				
				if (onMatchEnd)
					onMatchEnd(losers); 

				const playerSockets = players.map(p => io.sockets.sockets.get(p.socketId)).filter(Boolean);
				playerSockets.forEach(sock => { sock.leave(room); sock.gameRoom = null; });
				return ; 
			}
			
			gameState.ballX = gameConfig.canvasSize / 2;
			gameState.ballY = gameConfig.canvasSize / 2;

			const baseSpeedX = gameConfig.ballSpeed || 8;
			gameState.ballSpeedX = (Math.random() < 0.5 ? -baseSpeedX : baseSpeedX);

			let randomY;
			do
			{
				randomY = Math.random() * (baseSpeedX * 1.5) - (baseSpeedX * 0.75);
			}
			while (Math.abs(randomY) < baseSpeedX * 0.3);
			gameState.ballSpeedY = randomY;
		}
		
		if (!scored)
			io.to(room).emit('gameStateUpdate', gameState);
	}, 1000 / 60);

	game.intervalId = intervalId;

	const gameStartPayload =
	{
		players: players.map(p => ({id: p.id, name: p.name, email: p.email, position: p.position, team: p.team})),
		mode: mode,
		canvasSize: gameConfig.canvasSize,
		paddleSize: gameConfig.paddleSize,
		paddleThickness: gameConfig.paddleThickness,
		tournamentId: gameConfig.tournamentId || null 
	};
	io.to(room).emit('gameStart', gameStartPayload);
	return (game);
}

function handleJoinMatchmaking(io, socket, state, payload)
{
	const { mode, customSettings } = payload;
	if (!mode || !state.waitingPlayers[mode])
		return ;

	const isInAnyPool = Object.values(state.waitingPlayers).some(pool => pool.some(p => p.id === socket.id));
	if (isInAnyPool)
	{
		console.log(`[Matchmaking] ${socket.user.email} zaten bir bekleme havuzunda.`);
		return ;
	}

	socket.customGameSettings = customSettings;
	const pool = state.waitingPlayers[mode];
	pool.push(socket);
	pool.forEach(p => p.emit('updateQueue', { queueSize: pool.length, requiredSize: mode === '1v1' ? 2 : 4 }));

	let playerSockets;
	let players;
	let gameConfig;

	if (mode === '1v1' && pool.length >= 2)
	{
		playerSockets = pool.splice(0, 2);
		gameConfig = getGameConfig(playerSockets[0].customGameSettings);
		
		const [p1, p2] = playerSockets;
		players =
		[
			{ ...p1.user, socketId: p1.id, position: 'left', team: 1, x: 0, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) },
			{ ...p2.user, socketId: p2.id, position: 'right', team: 2, x: gameConfig.canvasSize - gameConfig.paddleThickness, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) }
		];
	}
	
	if (mode === '2v2' && pool.length >= 4)
	{
		playerSockets = pool.splice(0, 4);
		gameConfig = getGameConfig(playerSockets[0].customGameSettings);
		
		shuffleArray(playerSockets);
		const teamConfig = Math.random() < 0.5 ? 1 : 2;

		if (teamConfig === 1)
		{
			players =
			[
				{ ...playerSockets[0].user, socketId: playerSockets[0].id, position: 'left', team: 1 },
				{ ...playerSockets[1].user, socketId: playerSockets[1].id, position: 'top', team: 1 },
				{ ...playerSockets[2].user, socketId: playerSockets[2].id, position: 'right', team: 2 },
				{ ...playerSockets[3].user, socketId: playerSockets[3].id, position: 'bottom', team: 2 }
			];
		}
		else
		{
			players =
			[
				{ ...playerSockets[0].user, socketId: playerSockets[0].id, position: 'left', team: 1 },
				{ ...playerSockets[1].user, socketId: playerSockets[1].id, position: 'bottom', team: 1 },
				{ ...playerSockets[2].user, socketId: playerSockets[2].id, position: 'right', team: 2 },
				{ ...playerSockets[3].user, socketId: playerSockets[3].id, position: 'top', team: 2 }
			];
		}
		players.forEach(p =>
		{
			const center = (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2);
			if (p.position === 'left')
			{
				p.x = 0;
				p.y = center;
			}
			if (p.position === 'right')
			{
				p.x = gameConfig.canvasSize - gameConfig.paddleThickness;
				p.y = center;
			}
			if (p.position === 'top')
			{
				p.y = 0;
				p.x = center;
			}
			if (p.position === 'bottom')
			{
				p.y = gameConfig.canvasSize - gameConfig.paddleThickness;
				p.x = center;
			}
		});
	}

	if (players && playerSockets)
	{
		const roomName = `game_${Date.now()}`;
		playerSockets.forEach(sock =>
		{
			sock.join(roomName);
			sock.gameRoom = { id: roomName, mode: mode };
		});
		const game = startGameLoop(roomName, players, io, mode, gameConfig, null);
		state.gameRooms.set(roomName, game);
	}
}

module.exports =
{
	handleJoinMatchmaking,
	updatePlayerStats,
	saveMatch,
	startGameLoop,
	cleanUpPlayer
};