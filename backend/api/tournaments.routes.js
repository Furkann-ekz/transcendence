// backend/api/tournaments.routes.js

const prisma = require('../prisma/db');
const authenticate = require('../middleware/authenticate');
const { startNextMatch } = require('../websockets/tournamentHandler');

async function tournamentRoutes(fastify, { io, onlineUsers, gameRooms }) {
    
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
                            user: { select: { id: true, name: true, avatarUrl: true } }
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
            io.to(tournamentId).emit('tournament_lobby_updated');
            io.emit('tournament_list_updated');
            return updatedTournament;

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not join tournament.' });
        }
    });

    // Bir oyuncunun bir turnuvadan ayrılmasını sağlar
    fastify.delete('/tournaments/:id/leave', { preHandler: [authenticate] }, async (request, reply) => {
        const tournamentId = request.params.id;
        const userId = request.user.userId;

        try {
            const tournament = await prisma.tournament.findUnique({
                where: { id: tournamentId },
            });

            if (!tournament) {
                return reply.code(404).send({ error: 'Tournament not found.' });
            }

            // Kurucu turnuvadan ayrılamaz, sadece iptal edebilir (bu özellik daha sonra eklenebilir)
            if (tournament.hostId === userId) {
                return reply.code(403).send({ error: 'Host cannot leave the tournament.' });
            }

            // Oyuncunun turnuvadaki kaydını sil
            await prisma.tournamentPlayer.deleteMany({
                where: {
                    tournamentId: tournamentId,
                    userId: userId,
                }
            });

            // Lobi ve turnuva listesi ekranlarını güncellemek için sinyal gönder
            io.to(tournamentId).emit('tournament_lobby_updated');
            io.emit('tournament_list_updated');

            return reply.send({ success: true, message: 'Successfully left the tournament.' });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not leave tournament.' });
        }
    });

    fastify.post('/tournaments/:id/ready', { preHandler: [authenticate] }, async (request, reply) => {
        const tournamentId = request.params.id;
        const userId = request.user.userId;
        const { isReady } = request.body; // Body'den { "isReady": true/false } bekleniyor

        if (typeof isReady !== 'boolean') {
            return reply.code(400).send({ error: 'isReady field must be a boolean.' });
        }

        try {
            // Önce oyuncunun o turnuvada olup olmadığını kontrol edelim.
            const playerInTournament = await prisma.tournamentPlayer.findUnique({
                where: {
                    tournamentId_userId: {
                        tournamentId: tournamentId,
                        userId: userId
                    }
                }
            });

            if (!playerInTournament) {
                return reply.code(404).send({ error: 'You are not a player in this tournament.' });
            }
            
            // Oyuncunun durumunu güncelle
            await prisma.tournamentPlayer.update({
                where: {
                    id: playerInTournament.id
                },
                data: {
                    isReady: isReady
                }
            });

            // Lobi'deki diğer oyunculara durumun güncellendiğini bildir
            io.to(tournamentId).emit('tournament_lobby_updated');
            
            return reply.send({ success: true, message: `Ready status set to ${isReady}` });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not update ready status.' });
        }
    });

    fastify.post('/tournaments/:id/start', { preHandler: [authenticate] }, async (request, reply) => {
        const tournamentId = request.params.id;
        const userId = request.user.userId;

        try {
            // 1. Turnuvayı ve oyuncularını veritabanından çek
            const tournament = await prisma.tournament.findUnique({
                where: { id: tournamentId },
                include: { players: true }
            });

            if (!tournament) {
                return reply.code(404).send({ error: 'Tournament not found.' });
            }

            // 2. Yetki Kontrolü: Sadece kurucu başlatabilir
            if (tournament.hostId !== userId) {
                return reply.code(403).send({ error: 'Only the host can start the tournament.' });
            }

            // 3. Durum Kontrolü: Turnuva zaten başlamış mı?
            if (tournament.status !== 'LOBBY') {
                return reply.code(409).send({ error: 'Tournament has already started or is finished.' });
            }

            // 4. Başlatma Koşullarının Kontrolü
            const allPlayersReady = tournament.players.every(p => p.isReady);
            if (tournament.players.length < 4 || !allPlayersReady) {
                return reply.code(400).send({ error: 'To start, there must be at least 4 players and all must be ready.' });
            }

            // 5. Turnuvanın durumunu güncelle
            const updatedTournament = await prisma.tournament.update({
                where: { id: tournamentId },
                data: { status: 'IN_PROGRESS' },
                include: {
                    players: {
                        include: {
                            user: { select: { id: true, name: true, avatarUrl: true } }
                        }
                    }
                }
            });
            
            // 6. Lobi'deki herkese turnuvanın başladığını bildir
            io.to(tournamentId).emit('tournament_started', { tournament: updatedTournament });
            
            // DEĞİŞİKLİK: Eksik olan onlineUsers ve gameRooms parametrelerini ekliyoruz.
            startNextMatch(tournamentId, io, onlineUsers, gameRooms);
            
            return reply.send({ success: true, message: 'Tournament started!' });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not start the tournament.' });
        }
    });
}

module.exports = tournamentRoutes;