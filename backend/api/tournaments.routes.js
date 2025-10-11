const prisma = require('../prisma/db');
const authenticate = require('../middleware/authenticate');
const tournamentHandler = require('../websockets/tournamentHandler');

async function tournamentRoutes(fastify, { io })
{
	fastify.get('/tournaments', { preHandler: [authenticate] }, async (request, reply) =>
	{
		try
		{
			const tournaments = await prisma.tournament.findMany({
				where: { status: 'LOBBY' },
				include:
				{
					_count:
					{
						select: { players: true },
					},
					host:
					{
						select: { id: true, name: true }
					},
					players:
					{
						select: { userId: true }
					}
				},
				orderBy: { createdAt: 'desc' }
			});
			return (tournaments);
		}
		catch (error)
		{
			fastify.log.error(error);
			return (reply.code(500).send({ error: 'Could not fetch tournaments.' }));
		}
	});

	fastify.get('/tournaments/:id', { preHandler: [authenticate] }, async (request, reply) =>
	{
		const tournamentId = request.params.id;
		try
		{
			const tournament = await prisma.tournament.findUnique({
				where: { id: tournamentId },
				include:
				{
					players: {
						include:
						{
							user: { select: { id: true, name: true, avatarUrl: true } }
						}
					},
					winner:
					{
						select:
						{
							id: true,
							name: true
						}
					}
				}
			});
			if (!tournament)
				return (reply.code(404).send({ error: 'Tournament not found' }));
			return (tournament);
		}
		catch (error)
		{
			fastify.log.error(error);
			return (reply.code(500).send({ error: 'Could not fetch tournament details.' }));
		}
	});

	fastify.post('/tournaments', { preHandler: [authenticate] }, async (request, reply) =>
	{
		const hostId = request.user.userId;

		try
		{
			const existingParticipation = await prisma.tournamentPlayer.findFirst({
				where:
				{
					userId: hostId,
					isEliminated: false,
					tournament:
					{
						status: { in: ['LOBBY', 'IN_PROGRESS'] }
					}
				}
			});

			if (existingParticipation)
				return (reply.code(409).send({ error: 'error_already_in_tournament' }));

			const host = await prisma.user.findUnique({ where: { id: hostId } });
			if (!host)
				return (reply.code(404).send({ error: 'Host user not found.' }));

			const totalTournamentCount = await prisma.tournament.count({ where: { hostId: hostId } });

			const tournamentNumber = totalTournamentCount + 1;
			const tournamentName = `${host.name}'s Tournament #${tournamentNumber}`;

			const newTournament = await prisma.tournament.create({
				data:
				{
					name: tournamentName,
					hostId: hostId,
					players:
					{
						create:
						{
							userId: hostId,
							isReady: false,
						}
					}
				},
				include:
				{
					players: { include: { user: { select: { id: true, name: true } } } }
				}
			});
			io.emit('tournament_list_updated');
			return (newTournament);

		}
		catch (error)
		{
			if (error.code !== 'P2002')
				fastify.log.error(error);
			return (reply.code(500).send({ error: 'Could not create tournament.' }));
		}
	});

	fastify.post('/tournaments/:id/join', { preHandler: [authenticate] }, async (request, reply) =>
	{
		const tournamentId = request.params.id;
		const userId = request.user.userId;

		try
		{
			const existingParticipation = await prisma.tournamentPlayer.findFirst({
				where:
				{
					userId: userId,
					isEliminated: false,
					tournament:
					{
						status: { in: ['LOBBY', 'IN_PROGRESS'] }
					}
				}
			});

			if (existingParticipation)
				return (reply.code(409).send({ error: 'error_already_in_tournament' }));

			const tournament = await prisma.tournament.findUnique({
				where: { id: tournamentId },
				include: { players: true }
			});

			if (!tournament)
				return (reply.code(404).send({ error: 'Tournament not found.' }));
			if (tournament.status !== 'LOBBY')
				return (reply.code(403).send({ error: 'Tournament is not open for joining.' }));
			if (tournament.players.length >= 8)
				return (reply.code(403).send({ error: 'Tournament is full.' }));
			
			const updatedTournament = await prisma.tournament.update({
				where: { id: tournamentId },
				data:
				{
					players:
					{
						create: { userId: userId }
					}
				},
				include:
				{
					players: { include: { user: { select: { id: true, name: true } } } }
				}
			});
			io.to(tournamentId).emit('tournament_lobby_updated');
			io.emit('tournament_list_updated');
			return (updatedTournament);

		}
		catch (error)
		{
			fastify.log.error(error);
			return (reply.code(500).send({ error: 'Could not join tournament.' }));
		}
	});

	fastify.get('/tournaments/my-active-tournament', { preHandler: [authenticate] }, async (request, reply) =>
	{
		try
		{
			const activePlayerInTournament = await prisma.tournamentPlayer.findFirst({
				where:
				{
					userId: request.user.userId,
					isEliminated: false, 
					tournament:
					{
						status: { in: ['LOBBY', 'IN_PROGRESS'] }
					}
				},
				select:
				{
					tournament:
					{
						select:
						{
							id: true,
							status: true
						}
					}
				}
			});

			if (activePlayerInTournament)
				return (activePlayerInTournament.tournament);

			return (reply.code(204).send());

		}
		catch (error)
		{
			fastify.log.error('Error fetching active tournament:', error);
			return (reply.code(500).send({ error: 'Could not check for active tournament.' }));
		}
	});

	fastify.delete('/tournaments/:id/leave', { preHandler: [authenticate] }, async (request, reply) =>
	{
		const tournamentId = request.params.id;
		const userId = request.user.userId;

		try
		{
			const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, });

			if (!tournament)
				return (reply.code(404).send({ error: 'Tournament not found.' }));

			if (tournament.status !== 'LOBBY')
				return (reply.code(403).send({ error: 'Cannot leave a tournament that is in progress or has finished.' }));

			if (tournament.hostId === userId)
				return (reply.code(403).send({ error: 'Host cannot leave the tournament.' }));

			await prisma.tournamentPlayer.deleteMany({
				where:
				{
					tournamentId: tournamentId,
					userId: userId,
				}
			});

			io.to(tournamentId).emit('tournament_lobby_updated');
			io.emit('tournament_list_updated');

			return (reply.send({ success: true, message: 'Successfully left the tournament.' }));

		}
		catch (error)
		{
			fastify.log.error(error);
			return (reply.code(500).send({ error: 'Could not leave tournament.' }));
		}
	});

	// Delete/Destroy tournament (only host can do this)
	fastify.delete('/tournaments/:id', { preHandler: [authenticate] }, async (request, reply) =>
	{
		const tournamentId = request.params.id;
		const userId = request.user.userId;

		try
		{
			const tournament = await prisma.tournament.findUnique({ 
				where: { id: tournamentId },
				include: { players: true }
			});

			if (!tournament)
				return (reply.code(404).send({ error: 'Tournament not found.' }));

			if (tournament.hostId !== userId)
				return (reply.code(403).send({ error: 'Only the host can delete the tournament.' }));

			if (tournament.status !== 'LOBBY')
				return (reply.code(403).send({ error: 'Cannot delete a tournament that is in progress or has finished.' }));

			// Delete all tournament players first
			await prisma.tournamentPlayer.deleteMany({
				where: { tournamentId: tournamentId }
			});

			// Delete the tournament
			await prisma.tournament.delete({
				where: { id: tournamentId }
			});

			// Notify all players in the tournament lobby
			io.to(tournamentId).emit('tournament_deleted');
			io.emit('tournament_list_updated');

			return (reply.send({ success: true, message: 'Tournament successfully deleted.' }));

		}
		catch (error)
		{
			fastify.log.error(error);
			return (reply.code(500).send({ error: 'Could not delete tournament.' }));
		}
	});

	fastify.post('/tournaments/:id/ready', { preHandler: [authenticate] }, async (request, reply) =>
	{
		const tournamentId = request.params.id;
		const userId = request.user.userId;
		const { isReady } = request.body;

		if (typeof isReady !== 'boolean')
			return (reply.code(400).send({ error: 'isReady field must be a boolean.' }));

		try
		{
			const playerInTournament = await prisma.tournamentPlayer.findUnique({
				where:
				{
					tournamentId_userId:
					{
						tournamentId: tournamentId,
						userId: userId
					}
				}
			});

			if (!playerInTournament)
				return (reply.code(404).send({ error: 'You are not a player in this tournament.' }));
			
			await prisma.tournamentPlayer.update({
				where:
				{
					id: playerInTournament.id
				},
				data:
				{
					isReady: isReady
				}
			});

			io.to(tournamentId).emit('tournament_lobby_updated');

			return (reply.send({ success: true, message: `Ready status set to ${isReady}` }));

		}
		catch (error)
		{
			fastify.log.error(error);
			return (reply.code(500).send({ error: 'Could not update ready status.' }));
		}
	});

	fastify.post('/tournaments/:id/start', { preHandler: [authenticate] }, async (request, reply) =>
		{
		const tournamentId = request.params.id;
		const userId = request.user.userId;

		try
		{
			const tournament = await prisma.tournament.findUnique({
				where: { id: tournamentId },
				include: { players: true }
			});

			if (!tournament)
				return (reply.code(404).send({ error: 'Tournament not found.' }));
			if (tournament.hostId !== userId)
				return (reply.code(403).send({ error: 'Only the host can start the tournament.' }));
			if (tournament.status !== 'LOBBY')
				return (reply.code(409).send({ error: 'Tournament has already started or is finished.' }));
			const allPlayersReady = tournament.players.every(p => p.isReady);
			if (tournament.players.length < 4 || !allPlayersReady)
				return (reply.code(400).send({ error: 'To start, there must be at least 4 players and all must be ready.' }));

			const updatedTournament = await prisma.tournament.update({
				where: { id: tournamentId },
				data: { status: 'IN_PROGRESS' },
				include:
				{
					players:
					{
						include:
						{
							user: { select: { id: true, name: true, avatarUrl: true } }
						}
					}
				}
			});
			
			io.to(tournamentId).emit('tournament_started', { tournament: updatedTournament });
			
			setTimeout(() => { tournamentHandler.startNextMatch(tournamentId, io); }, 2000);
			
			return (reply.send({ success: true, message: 'Tournament started!' }));

		}
		catch (error)
		{
			fastify.log.error(error);
			return (reply.code(500).send({ error: 'Could not start the tournament.' }));
		}
	});
}

module.exports = tournamentRoutes;