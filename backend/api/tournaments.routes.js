// backend/api/tournaments.routes.js

const prisma = require('../prisma/db');
const authenticate = require('../middleware/authenticate');

// Turnuva odalarının anlık durumunu sunucu belleğinde tutacağız.
// Bu, WebSocket'te hangi oyuncunun hangi odada olduğunu bilmemizi sağlayacak.
const tournamentRooms = new Map();

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

    // Yeni bir turnuva oluşturur
    fastify.post('/tournaments', { preHandler: [authenticate] }, async (request, reply) => {
        const hostId = request.user.userId;
        try {
            const newTournament = await prisma.tournament.create({
                data: {
                    hostId: hostId,
                    players: {
                        create: {
                            userId: hostId,
                            isReady: false, // Kurucu başlangıçta hazır değil
                        }
                    }
                },
                include: {
                    players: { include: { user: { select: { id: true, name: true } } } }
                }
            });
            // Sunucu belleğinde yeni turnuva odasını oluştur
            tournamentRooms.set(newTournament.id, new Set([hostId]));
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

            // Oyuncuyu sunucu belleğindeki odaya ekle
            const room = tournamentRooms.get(tournamentId);
            if (room) {
                room.add(userId);
            } else {
                // Eğer oda yoksa (sunucu yeniden başlamışsa), veritabanından yeniden oluştur
                const playerIds = updatedTournament.players.map(p => p.userId);
                tournamentRooms.set(tournamentId, new Set(playerIds));
            }

            // Odaya yeni katılan oyuncu hakkında bilgi yayını yap (bir sonraki adımda detaylanacak)
            io.to(tournamentId).emit('tournament:stateUpdate', updatedTournament);

            return updatedTournament;

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not join tournament.' });
        }
    });
}

module.exports = tournamentRoutes;