// backend/api/tournaments.routes.js

const prisma = require('../prisma/db');
const authenticate = require('../middleware/authenticate');

async function tournamentRoutes(fastify, { io }) {
    
    // Aktif, Lobi durumundaki turnuvaları listeler
    fastify.get('/tournaments', { preHandler: [authenticate] }, async (request, reply) => {
		try {
			const tournaments = await prisma.tournament.findMany({
				where: { status: 'LOBBY' },
				include: {
					_count: {
						select: { players: true },
					},
					host: {
						select: { id: true, name: true }
					},
					// YENİ EKLENEN SATIR: Oyuncu listesini de dahil et
					players: {
						select: { userId: true }
					}
				},
				orderBy: { createdAt: 'desc' }
			});
			return tournaments;
		} catch (error) {
			fastify.log.error(error);
			return reply.code(500).send({ error: 'Could not fetch tournaments.' });
		}
	});

	fastify.get('/tournaments/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const tournamentId = request.params.id;
        try {
            const tournament = await prisma.tournament.findUnique({
                where: { id: tournamentId },
                include: {
                    players: {
                        include: {
                            user: { select: { id: true, name: true } }
                        }
                    }
                }
            });
            if (!tournament) {
                return reply.code(404).send({ error: 'Tournament not found' });
            }
            return tournament;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not fetch tournament details.' });
        }
    });

    // Yeni bir turnuva oluşturur
    fastify.post('/tournaments', { preHandler: [authenticate] }, async (request, reply) => {
        const hostId = request.user.userId;
        const host = await prisma.user.findUnique({ where: { id: hostId } });

        if (!host) {
            return reply.code(404).send({ error: 'Host user not found.' });
        }

        try {
            // Bu kullanıcının şimdiye kadar kurduğu tüm turnuvaları say
            const totalTournamentCount = await prisma.tournament.count({
                where: {
                    hostId: hostId,
                }
            });

            const tournamentNumber = totalTournamentCount + 1;
            // İsimlendirme kuralını burada uyguluyoruz
            const tournamentName = `${host.name}'s Tournament #${tournamentNumber}`;

            const newTournament = await prisma.tournament.create({
                data: {
                    name: tournamentName, // Veritabanına yeni oluşturulan ismi kaydet
                    hostId: hostId,
                    players: {
                        create: {
                            userId: hostId,
                            isReady: false,
                        }
                    }
                },
                include: {
                    players: { include: { user: { select: { id: true, name: true } } } }
                }
            });
            io.emit('tournament_list_updated');
            return newTournament;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not create tournament.' });
        }
    });

    // Mevcut bir turnuvaya katılmayı sağlar
    fastify.post('/tournaments/:id/join', { preHandler: [authenticate] }, async (request, reply) => {
        const tournamentId = request.params.id;
        const userId = request.user.userId;

        try {
            const tournament = await prisma.tournament.findUnique({
                where: { id: tournamentId },
                include: { players: true }
            });

            if (!tournament) {
                return reply.code(404).send({ error: 'Tournament not found.' });
            }
            if (tournament.status !== 'LOBBY') {
                return reply.code(403).send({ error: 'Tournament is not open for joining.' });
            }
            if (tournament.players.length >= 8) {
                return reply.code(403).send({ error: 'Tournament is full.' });
            }
            if (tournament.players.some(p => p.userId === userId)) {
                return reply.code(409).send({ error: 'You have already joined this tournament.' });
            }

            const updatedTournament = await prisma.tournament.update({
                where: { id: tournamentId },
                data: {
                    players: {
                        create: { userId: userId }
                    }
                },
                include: {
                    players: { include: { user: { select: { id: true, name: true } } } }
                }
            });

            return updatedTournament;

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not join tournament.' });
        }
    });
}

module.exports = tournamentRoutes;