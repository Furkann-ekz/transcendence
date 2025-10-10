const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');
const chatHandler = require('./chatHandler');
const { handleJoinMatchmaking, cleanUpPlayer } = require('./gameHandler');
const tournamentHandler = require('./tournamentHandler');
const JWT_SECRET = process.env.JWT_SECRET;

function initializeSocket(io)
{
	const onlineUsers = new Map();
	const gameState =
	{
		waitingPlayers: { '1v1': [], '2v2': [] },
		gameRooms: new Map()
	};

	const removeFromAllQueues = (socket) =>
	{
		let updated = false;
		for (const mode in gameState.waitingPlayers)
		{
			const pool = gameState.waitingPlayers[mode];
			const index = pool.findIndex(p => p.id === socket.id);
			if (index !== -1)
			{
				pool.splice(index, 1);
				console.log(`[Matchmaking] ${socket.user.email}, ${mode} sırasından kaldırıldı.`);
				updated = true;
				pool.forEach(p => p.emit('updateQueue', { queueSize: pool.length, requiredSize: mode === '1v1' ? 2 : 4 }));
			}
		}
	};

	io.use(async (socket, next) =>
	{
		const token = socket.handshake.auth.token;
		if (!token)
			return (next(new Error('Authentication error')));
		try
		{
			const decoded = jwt.verify(token, JWT_SECRET);
			const user = await prisma.user.findUnique({
				where: { id: decoded.userId },
				select: { id: true, email: true, name: true }
			});
			if (!user)
				return (next(new Error('User not found')));
			socket.user = user;
			next();
		}
		catch (err)
		{
			return (next(new Error('Invalid token')));
		}
	});

	io.on('connection', (socket) =>
	{
		if (onlineUsers.has(socket.user.id))
		{
			const oldSocketId = onlineUsers.get(socket.user.id).socketId;
			const oldSocket = io.sockets.sockets.get(oldSocketId);
			if (oldSocket)
			{
				oldSocket.emit('forceDisconnect', 'Başka bir yerden giriş yapıldı.');
				oldSocket.disconnect();
			}
		}
		onlineUsers.set(socket.user.id, { id: socket.user.id, socketId: socket.id, email: socket.user.email, name: socket.user.name });
		io.emit('update user list', Array.from(onlineUsers.values()));
		socket.on('requestUserList', () => {
			socket.emit('update user list', Array.from(onlineUsers.values()));
		});
		chatHandler(io, socket, onlineUsers);
		tournamentHandler.handlePlayerReady(socket, io, onlineUsers, gameState.gameRooms);
		tournamentHandler.handleRequestCurrentMatch(socket);
		socket.on('joinMatchmaking', (payload) => handleJoinMatchmaking(io, socket, gameState, payload));
		socket.on('join_tournament_lobby', ({ tournamentId }) => { if (tournamentId) socket.join(tournamentId); });
		socket.on('leave_tournament_lobby', ({ tournamentId }) => { if (tournamentId) socket.leave(tournamentId); });

		socket.on('leave_tournament', async ({ tournamentId }) =>
		{
			const userId = socket.user.id;
			
			if (socket.gameRoom)
			{
				const game = gameState.gameRooms.get(socket.gameRoom.id);
				if (game && game.onMatchEnd)
				{
					await cleanUpPlayer(socket, io, gameState.gameRooms);
					return ;
				}
			}
			
			await tournamentHandler.handlePlayerLeave(tournamentId, userId, io);
		});
		
		socket.on('disconnect', async () =>
		{
			console.log(`${socket.user.email} bağlantısı kesildi.`);
			removeFromAllQueues(socket);
			if (onlineUsers.has(socket.user.id) && onlineUsers.get(socket.user.id).socketId === socket.id)
			{
				onlineUsers.delete(socket.user.id);
				io.emit('update user list', Array.from(onlineUsers.values()));
			}

			await cleanUpPlayer(socket, io, gameState.gameRooms);

			try
			{
				const playerInTournament = await prisma.tournamentPlayer.findFirst({
					where: { userId: socket.user.id, isEliminated: false, tournament: { status: 'IN_PROGRESS' } },
					select: { tournamentId: true }
				});

				if (playerInTournament)
				{
					const { tournamentId } = playerInTournament;
					console.log(`[Tournament ${tournamentId}] Oyuncu ${socket.user.name} bağlantısı koptuğu için ayrılma işlemi tetikleniyor.`);
					await tournamentHandler.handlePlayerLeave(tournamentId, socket.user.id, io);
				}
			}
			catch (error)
			{
				console.error('Disconnect sırasında turnuva kontrolü hatası:', error);
			}
		});

		socket.on('leaveGameOrLobby', () =>
		{
			removeFromAllQueues(socket);
			cleanUpPlayer(socket, io, gameState.gameRooms);
		});

		socket.on('client_ready_for_game', () =>
		{
			 if (socket.gameRoom)
			{
				const game = gameState.gameRooms.get(socket.gameRoom.id);
				if (game)
				{
					const gameStartPayload =
					{
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
		socket.on('playerMove', (data) =>
		{
			if (!socket.gameRoom)
				return ;
			const game = gameState.gameRooms.get(socket.gameRoom.id);
			if (!game)
				return ;
			const playerState = game.gameState.players.find(p => p.id === socket.user.id);
			if (!playerState)
				return ;
			const canvasSize = game.canvasSize || 800;
			const paddleSize = game.paddleSize || 100;
			const { newPosition } = data;
			let finalPosition = newPosition;
			if (finalPosition < 0)
				finalPosition = 0;
			if (finalPosition > canvasSize - paddleSize)
				finalPosition = canvasSize - paddleSize;
			if (playerState.position === 'left' || playerState.position === 'right')
				playerState.y = finalPosition;
			if (playerState.position === 'top' || playerState.position === 'bottom')
				playerState.x = finalPosition;
		});

		socket.on('invite_to_game', async ({ recipientId }) =>
		{
			const senderId = socket.user.id;
			
			if (senderId === recipientId)
				return ;

			const blockExists = await prisma.block.findFirst({
				where:
				{
					OR:
					[
						{ blockerId: senderId, blockedId: recipientId },
						{ blockerId: recipientId, blockedId: senderId },
					]
				}
			});

			if (!blockExists)
			{
				const recipientSocketInfo = onlineUsers.get(recipientId);
				if (recipientSocketInfo)
				{
					const recipientSocket = io.sockets.sockets.get(recipientSocketInfo.socketId);
					if (recipientSocket)
					{
						recipientSocket.emit('game_invitation',
						{
							inviter: { id: socket.user.id, name: socket.user.name }
						});
					}
				}
			}
		});

		socket.on('invitation_response', async ({ inviterId, accepted }) =>
		{
			const inviterSocketInfo = onlineUsers.get(inviterId);
			if (inviterSocketInfo)
			{
				const inviterSocket = io.sockets.sockets.get(inviterSocketInfo.socketId);
				const recipientSocket = socket;

				if (inviterSocket && accepted)
				{
					console.log(`[Game Invite] ${inviterSocket.user.name} ve ${recipientSocket.user.name} için eski oyunlar temizleniyor...`);
					await cleanUpPlayer(inviterSocket, io, gameState.gameRooms);
					await cleanUpPlayer(recipientSocket, io, gameState.gameRooms);

					if (inviterSocket.gameRoom || recipientSocket.gameRoom)
					{
						console.warn(`[Game Invite] Davet kabul edildi ancak oyunculardan biri zaten başka bir oyuna başladı. Yeni oyun iptal edildi.`);
						recipientSocket.emit('game_invite_failed', { reason: 'Player is now busy.' });
						return ;
					}

					const roomName = `game_invite_${Date.now()}`;
					const gameConfig = { canvasSize: 800, paddleSize: 100, paddleThickness: 15 };
					
					const players =
					[
						{ ...inviterSocket.user, socketId: inviterSocket.id, position: 'left', team: 1, x: 0, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) },
						{ ...recipientSocket.user, socketId: recipientSocket.id, position: 'right', team: 2, x: gameConfig.canvasSize - gameConfig.paddleThickness, y: (gameConfig.canvasSize / 2) - (gameConfig.paddleSize / 2) }
					];

					[inviterSocket, recipientSocket].forEach(sock =>
					{
						if (sock)
						{
							sock.join(roomName);
							sock.gameRoom = { id: roomName, mode: '1v1-invite' };
							sock.emit('go_to_invited_game');
						}
					});
					
					const { startGameLoop } = require('./gameHandler');
					const game = startGameLoop(roomName, players, io, '1v1', gameConfig, null);
					gameState.gameRooms.set(roomName, game);

				}
				else if (inviterSocket && !accepted)
				{
					inviterSocket.emit('invitation_declined', {
						recipient: { id: recipientSocket.user.id, name: recipientSocket.user.name }
					});
				}
			}
		});
	});

	return { onlineUsers, gameRooms: gameState.gameRooms };
}

module.exports = initializeSocket;